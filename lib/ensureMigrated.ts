import { getDb } from './db';
import { runMigrations } from './migrate';

// Runs the same idempotent migration scripts/migrate.ts runs locally, but as
// a side effect of a real request — so schema changes reach production even
// if a local `TURSO_*` env var never resolves (e.g. Vercel "Sensitive" vars,
// which can't be pulled back out via CLI once set). Cached per server
// instance; a failure clears the cache so the next request retries.
const g = globalThis as typeof globalThis & { __migrated?: Promise<void> };

export function ensureMigrated() {
  if (!g.__migrated) {
    g.__migrated = runMigrations(getDb()).catch((err) => {
      g.__migrated = undefined;
      throw err;
    });
  }
  return g.__migrated;
}
