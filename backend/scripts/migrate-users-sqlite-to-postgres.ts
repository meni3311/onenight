/**
 * One-off data migration: SQLite `users` table → Postgres (Supabase) `User`.
 *
 * Run from the backend/ directory:
 *   npx ts-node scripts/migrate-users-sqlite-to-postgres.ts
 *
 * Properties this script guarantees:
 *   - READ-ONLY against SQLite. The source database is opened with
 *     `readonly: true`, so a bad run can't damage the safety net.
 *   - Idempotent. Every write is an `upsert` keyed on the primary `id`, so
 *     running it twice updates the same rows instead of duplicating them.
 *   - Preserves ids. The uuid from SQLite is carried over verbatim, so any
 *     future foreign keys pointing at a user id stay valid.
 *   - Never re-hashes. `password` is already a bcrypt hash and is copied as
 *     an opaque string.
 *   - Fault-tolerant. A row that fails (e.g. a duplicate email tripping the
 *     unique constraint) is collected and reported at the end rather than
 *     aborting the whole run.
 *
 * Note on the source table name: the TypeORM entity is declared as
 * `@Entity('users')`, so the SQLite table is `users` (plural), not `user`.
 */
import * as path from 'path';
import Database from 'better-sqlite3';
import { PrismaClient } from '@prisma/client';

/** Shape of a row as it exists in the SQLite `users` table. */
interface SqliteUserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  username: string | null;
  city: string | null;
  password: string;
  /** SQLite has no native boolean — TypeORM stores these as 0/1 integers. */
  verified: number;
  marketingConsent: number;
  /** Stored as a 'YYYY-MM-DD HH:MM:SS' string by TypeORM's datetime column. */
  createdAt: string;
}

interface FailedRow {
  id: string;
  email: string;
  reason: string;
}

const SQLITE_PATH = path.join(__dirname, '..', 'data', 'onenight.sqlite');

/** SQLite 0/1 → JS boolean. */
const toBool = (v: number | null): boolean => v === 1;

/**
 * TypeORM writes 'YYYY-MM-DD HH:MM:SS' (UTC). `new Date()` parses that as
 * local time, which would silently shift every timestamp by the machine's
 * offset, so the 'Z' is appended explicitly. Falls back to now() only if the
 * column is unexpectedly empty.
 */
function parseCreatedAt(raw: string | null): Date {
  if (!raw) return new Date();
  const normalized = raw.includes('T') ? raw : raw.replace(' ', 'T');
  const withZone = /(Z|[+-]\d{2}:?\d{2})$/.test(normalized)
    ? normalized
    : `${normalized}Z`;
  const parsed = new Date(withZone);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

async function main(): Promise<void> {
  console.log(`\nReading SQLite source: ${SQLITE_PATH}`);

  const sqlite = new Database(SQLITE_PATH, { readonly: true, fileMustExist: true });

  const tableExists = sqlite
    .prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='users'`)
    .get();
  if (!tableExists) {
    throw new Error(
      "No `users` table found in the SQLite database — nothing to migrate.",
    );
  }

  const rows = sqlite.prepare('SELECT * FROM users').all() as SqliteUserRow[];
  sqlite.close();

  console.log(`Rows read from SQLite : ${rows.length}`);

  const prisma = new PrismaClient();
  const failures: FailedRow[] = [];
  let created = 0;
  let updated = 0;

  try {
    for (const row of rows) {
      // Distinguish insert from update purely for the summary line — the
      // upsert below is what actually decides, atomically.
      const existing = await prisma.user.findUnique({
        where: { id: row.id },
        select: { id: true },
      });

      const data = {
        name: row.name,
        email: row.email,
        phone: row.phone,
        username: row.username,
        city: row.city,
        password: row.password, // already a bcrypt hash — copied verbatim
        verified: toBool(row.verified),
        marketingConsent: toBool(row.marketingConsent),
        createdAt: parseCreatedAt(row.createdAt),
      };

      try {
        await prisma.user.upsert({
          where: { id: row.id },
          create: { id: row.id, ...data },
          update: data,
        });
        if (existing) {
          updated += 1;
        } else {
          created += 1;
        }
      } catch (error: unknown) {
        const err = error as { code?: string; meta?: { target?: unknown }; message?: string };
        const target = Array.isArray(err.meta?.target)
          ? (err.meta?.target as string[]).join(', ')
          : String(err.meta?.target ?? '');
        const reason =
          err.code === 'P2002'
            ? `unique constraint violation on: ${target || 'unknown field'}`
            : err.message || String(error);
        failures.push({ id: row.id, email: row.email, reason });
      }
    }
  } finally {
    await prisma.$disconnect();
  }

  const written = created + updated;

  console.log('\n──────── migration summary ────────');
  console.log(`Rows read from SQLite : ${rows.length}`);
  console.log(`Rows written to PG    : ${written}  (created ${created}, updated ${updated})`);
  console.log(`Rows failed           : ${failures.length}`);

  if (failures.length > 0) {
    console.log('\nFailed rows:');
    for (const f of failures) {
      console.log(`  - id=${f.id}  email=${f.email}\n      ${f.reason}`);
    }
    console.log(
      '\nNothing was deleted or modified in SQLite — re-run this script after resolving the conflicts above.',
    );
    process.exitCode = 1;
    return;
  }

  console.log('\nAll rows migrated cleanly.');
}

main().catch((error) => {
  console.error('\nMigration aborted:', error);
  process.exit(1);
});
