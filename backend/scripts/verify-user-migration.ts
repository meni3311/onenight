/**
 * Step 3 verification: proves the SQLite → Postgres user migration is faithful
 * BEFORE any application code is switched over.
 *
 * Run from the backend/ directory:
 *   npx ts-node scripts/verify-user-migration.ts
 *
 * Read-only against both databases. Exits non-zero if any check fails, so it
 * can gate the rest of the migration.
 *
 * Checks:
 *   1. Row counts match between SQLite `users` and Postgres `User`.
 *   2. Every email is unique in Postgres; reports duplicate usernames as INFO
 *      only, since `username` is intentionally non-unique (display-only handle).
 *   3. Field-by-field comparison of every row — password hash compared as an
 *      exact string, plus verified / marketingConsent / name / email / phone /
 *      city / username.
 */
import * as path from 'path';
import Database from 'better-sqlite3';
import { PrismaClient } from '@prisma/client';

interface SqliteUserRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  username: string | null;
  city: string | null;
  password: string;
  verified: number;
  marketingConsent: number;
  createdAt: string;
}

const SQLITE_PATH = path.join(__dirname, '..', 'data', 'onenight.sqlite');
const toBool = (v: number | null): boolean => v === 1;

/** Masks a bcrypt hash for console output — enough to compare by eye. */
const mask = (hash: string): string =>
  `${hash.slice(0, 15)}…${hash.slice(-6)} (len=${hash.length})`;

async function main(): Promise<void> {
  const sqlite = new Database(SQLITE_PATH, { readonly: true, fileMustExist: true });
  const sqliteRows = sqlite.prepare('SELECT * FROM users').all() as SqliteUserRow[];
  sqlite.close();

  const prisma = new PrismaClient();
  let failed = false;

  try {
    const pgRows = await prisma.user.findMany();

    // ── 1. row counts ────────────────────────────────────────────────────
    console.log('\n── 1. row counts ──');
    console.log(`  SQLite  users : ${sqliteRows.length}`);
    console.log(`  Postgres User : ${pgRows.length}`);
    if (sqliteRows.length !== pgRows.length) {
      console.log('  ✗ MISMATCH');
      failed = true;
    } else {
      console.log('  ✓ match');
    }

    // ── 2. uniqueness ────────────────────────────────────────────────────
    console.log('\n── 2. uniqueness in Postgres ──');
    const emails = pgRows.map((u) => u.email);
    const dupeEmails = emails.filter((e, i) => emails.indexOf(e) !== i);
    if (dupeEmails.length > 0) {
      console.log(`  ✗ duplicate emails: ${[...new Set(dupeEmails)].join(', ')}`);
      failed = true;
    } else {
      console.log(`  ✓ all ${emails.length} emails unique`);
    }

    const usernames = pgRows.map((u) => u.username).filter((u): u is string => !!u);
    const dupeUsernames = usernames.filter((u, i) => usernames.indexOf(u) !== i);
    const nullUsernames = pgRows.filter((u) => !u.username).length;
    console.log(
      `  · usernames: ${usernames.length} set, ${nullUsernames} null` +
        (dupeUsernames.length
          ? `, duplicates: ${[...new Set(dupeUsernames)].join(', ')} (allowed — display-only handle)`
          : ', no duplicates'),
    );

    // ── 3. field-by-field comparison ─────────────────────────────────────
    console.log('\n── 3. row-by-row field comparison ──');
    const pgById = new Map(pgRows.map((u) => [u.id, u]));

    for (const src of sqliteRows) {
      const dst = pgById.get(src.id);
      console.log(`\n  id=${src.id}`);

      if (!dst) {
        console.log('    ✗ MISSING in Postgres');
        failed = true;
        continue;
      }

      const comparisons: Array<[string, unknown, unknown]> = [
        ['name', src.name, dst.name],
        ['email', src.email, dst.email],
        ['phone', src.phone, dst.phone],
        ['username', src.username, dst.username],
        ['city', src.city, dst.city],
        ['password', src.password, dst.password],
        ['verified', toBool(src.verified), dst.verified],
        ['marketingConsent', toBool(src.marketingConsent), dst.marketingConsent],
      ];

      for (const [field, a, b] of comparisons) {
        const same = a === b;
        if (!same) failed = true;
        const shown =
          field === 'password'
            ? `${mask(String(a))}  vs  ${mask(String(b))}`
            : `${JSON.stringify(a)}  vs  ${JSON.stringify(b)}`;
        console.log(`    ${same ? '✓' : '✗'} ${field.padEnd(17)} ${shown}`);
      }
    }

    // Rows that exist in Postgres but not SQLite (e.g. created after the copy).
    const extra = pgRows.filter((u) => !sqliteRows.some((s) => s.id === u.id));
    if (extra.length > 0) {
      console.log(
        `\n  · ${extra.length} row(s) in Postgres with no SQLite counterpart: ` +
          extra.map((u) => u.email).join(', '),
      );
    }
  } finally {
    await prisma.$disconnect();
  }

  console.log(
    failed
      ? '\nRESULT: ✗ verification FAILED — do not proceed to the code refactor.\n'
      : '\nRESULT: ✓ verification passed — safe to proceed.\n',
  );
  process.exitCode = failed ? 1 : 0;
}

main().catch((error) => {
  console.error('\nVerification aborted:', error);
  process.exit(1);
});
