/* ============================================================================
   Load backend/.env into process.env — a side effect, imported first in
   main.ts (before ./app.module, which reads process.env at module scope).

   WHY THIS FILE EXISTS
   --------------------
   Nothing in this app deliberately reads .env. There is no `@nestjs/config`,
   no `dotenv` dependency, and no `--env-file` flag in any npm script.

   And yet RESEND_API_KEY, FRONTEND_URL and the rest do arrive — measured, not
   assumed: importing `@prisma/client` populates `process.env` from .env as a
   side effect of resolving its own datasource url, and it does so for every
   key in the file, not just DATABASE_URL. So the configuration of this server
   currently depends on an ORM's internal startup behaviour.

   That is a load-bearing accident. It breaks silently if Prisma changes it,
   if a future module reads process.env before the Prisma import happens
   (module-scope constants like AdminGuard's ADMIN_PASSWORD are evaluated at
   import time, and their position in the graph is not something anyone is
   tracking), or the day this app talks to something other than Prisma. This
   file replaces the accident with a statement: env comes from here, first,
   before anything else runs.

   It is not a behaviour change. Every value it sets is a value Prisma's
   loader would have set anyway; it just sets them earlier and says so.

   RULES
   -----
   - A variable already present in the real environment ALWAYS wins. This runs
     in production too (Render sets its variables in the process environment,
     and there is no .env file there at all), so a file must never be able to
     override what the platform provided.
   - A missing .env is not an error. That's the normal production case.
   - Surrounding single or double quotes are stripped, matching dotenv — the
     current .env has `RESEND_FROM="onenight <...>"`, and the quotes are not
     part of the address.
============================================================================ */
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Where to look, in order.
 *
 * `__dirname` differs between `nest start` (src/common) and a built server
 * (dist/common), and the working directory differs between `npm start` in
 * backend/ and a process manager launching from the repo root — so this
 * checks the plausible spots rather than assuming any one of them.
 */
function candidatePaths(): string[] {
  const explicit = process.env.ENV_FILE;
  return [
    ...(explicit ? [resolve(explicit)] : []),
    resolve(process.cwd(), '.env'),
    resolve(__dirname, '..', '..', '.env'), // src/common/… or dist/common/… → backend/
    resolve(__dirname, '..', '..', '..', '.env'),
  ];
}

/** Strip one matching pair of surrounding quotes, if present. */
function unquote(raw: string): string {
  const v = raw.trim();
  if (v.length >= 2) {
    const first = v[0];
    const last = v[v.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return v.slice(1, -1);
    }
  }
  return v;
}

/**
 * Parse a .env file body. Deliberately minimal — `KEY=value`, `#` comments,
 * optional `export ` prefix, blank lines. No multi-line values and no `${VAR}`
 * interpolation: nothing in this project's .env uses either, and quietly
 * mis-parsing a secret is worse than not supporting a syntax nobody wrote.
 */
export function parseEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const withoutExport = line.startsWith('export ') ? line.slice(7).trim() : line;
    const eq = withoutExport.indexOf('=');
    if (eq <= 0) continue;

    const key = withoutExport.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;

    out[key] = unquote(withoutExport.slice(eq + 1));
  }
  return out;
}

/**
 * Read the first .env found and merge it into process.env without clobbering.
 * Returns the path used and the names (never the values) of what it set, so
 * boot logging can be specific without leaking secrets.
 */
export function loadEnv(): { file: string | null; applied: string[]; skipped: string[] } {
  for (const file of candidatePaths()) {
    if (!existsSync(file)) continue;

    let parsed: Record<string, string>;
    try {
      parsed = parseEnv(readFileSync(file, 'utf8'));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(`[env] could not read ${file}: ${(err as Error).message}`);
      return { file: null, applied: [], skipped: [] };
    }

    const applied: string[] = [];
    const skipped: string[] = [];
    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] !== undefined) {
        skipped.push(key); // real environment wins — see the header
        continue;
      }
      process.env[key] = value;
      applied.push(key);
    }
    return { file, applied, skipped };
  }
  return { file: null, applied: [], skipped: [] };
}

const result = loadEnv();
if (result.file) {
  // eslint-disable-next-line no-console
  console.log(
    `[env] loaded ${result.file} — set ${result.applied.length} variable(s)` +
      (result.skipped.length
        ? `, kept ${result.skipped.length} already in the environment`
        : ''),
  );
} else {
  // eslint-disable-next-line no-console
  console.log('[env] no .env file found — using the process environment as-is');
}
