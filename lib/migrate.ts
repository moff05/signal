import type { getDb } from './db';

async function columnExists(db: ReturnType<typeof getDb>, table: string, column: string) {
  const result = await db.execute(`PRAGMA table_info(${table})`);
  return result.rows.some((row) => row.name === column);
}

export async function runMigrations(db: ReturnType<typeof getDb>) {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS signals (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      attachment_url TEXT,
      type TEXT NOT NULL CHECK(type IN ('fixed_time','deadline','someday')),
      event_datetime TEXT,
      due_date TEXT,
      is_today_signal INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','done','deleted')),
      gcal_event_id TEXT,
      details TEXT,
      repeat TEXT NOT NULL DEFAULT 'none' CHECK(repeat IN ('none','weekly','monthly')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      deleted_at TEXT,
      sort_order INTEGER
    )
  `);

  // Recurring signals: marking one done regenerates a fresh copy with the
  // date advanced instead of just disappearing into the archive for good.
  if (!(await columnExists(db, 'signals', 'repeat'))) {
    await db.execute(`ALTER TABLE signals ADD COLUMN repeat TEXT NOT NULL DEFAULT 'none'`);
  }

  // Long free-text input gets AI-condensed into `text` (the title); the
  // original full text is preserved here for the expandable detail view.
  if (!(await columnExists(db, 'signals', 'details'))) {
    await db.execute(`ALTER TABLE signals ADD COLUMN details TEXT`);
  }

  // Migrate off the old three-way manual_state enum (signal/on_deck/urgent)
  // to a single boolean: "urgent" is now computed from the date, not tapped.
  if (!(await columnExists(db, 'signals', 'is_today_signal'))) {
    await db.execute(`ALTER TABLE signals ADD COLUMN is_today_signal INTEGER NOT NULL DEFAULT 0`);
    if (await columnExists(db, 'signals', 'manual_state')) {
      await db.execute(`UPDATE signals SET is_today_signal = 1 WHERE manual_state = 'signal'`);
    }
  }
  if (await columnExists(db, 'signals', 'manual_state')) {
    await db.execute(`ALTER TABLE signals DROP COLUMN manual_state`);
  }

  if (!(await columnExists(db, 'signals', 'deleted_at'))) {
    await db.execute(`ALTER TABLE signals ADD COLUMN deleted_at TEXT`);
  }

  // Manual ordering within today's Signal only — null until the user actually
  // reorders, at which point it's the sole ordering key for that subset. The
  // backlog stays purely urgency-sorted, untouched by this column.
  if (!(await columnExists(db, 'signals', 'sort_order'))) {
    await db.execute(`ALTER TABLE signals ADD COLUMN sort_order INTEGER`);
  }

  // Delete used to be instant and permanent — a mis-tap destroyed a note with
  // no recovery, unlike Done (which lands in a restorable Archive). Widening
  // the status enum to include 'deleted' makes Delete a soft-delete too.
  // SQLite can't ALTER a CHECK constraint in place, so rebuild the table when
  // an older constraint (missing 'deleted') is found. By this point every
  // column the rebuild's INSERT...SELECT references is guaranteed to exist.
  const tableInfo = await db.execute(`SELECT sql FROM sqlite_master WHERE type='table' AND name='signals'`);
  const currentSql = tableInfo.rows[0]?.sql as string | undefined;
  if (currentSql && !currentSql.includes("'deleted'")) {
    await db.execute(`ALTER TABLE signals RENAME TO signals_old`);
    await db.execute(`
      CREATE TABLE signals (
        id TEXT PRIMARY KEY,
        text TEXT NOT NULL,
        attachment_url TEXT,
        type TEXT NOT NULL CHECK(type IN ('fixed_time','deadline','someday')),
        event_datetime TEXT,
        due_date TEXT,
        is_today_signal INTEGER NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','done','deleted')),
        gcal_event_id TEXT,
        details TEXT,
        repeat TEXT NOT NULL DEFAULT 'none' CHECK(repeat IN ('none','weekly','monthly')),
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT,
        deleted_at TEXT,
        sort_order INTEGER
      )
    `);
    await db.execute(`
      INSERT INTO signals (id, text, attachment_url, type, event_datetime, due_date, is_today_signal, status, gcal_event_id, details, repeat, created_at, completed_at, deleted_at, sort_order)
      SELECT id, text, attachment_url, type, event_datetime, due_date, is_today_signal, status, gcal_event_id, details, repeat, created_at, completed_at, deleted_at, sort_order
      FROM signals_old
    `);
    await db.execute(`DROP TABLE signals_old`);
  }

  await db.execute(
    `CREATE INDEX IF NOT EXISTS idx_signals_status ON signals(status)`
  );

  await db.execute(`
    CREATE TABLE IF NOT EXISTS google_auth (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      refresh_token TEXT NOT NULL,
      calendar_id TEXT NOT NULL DEFAULT 'primary'
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      endpoint TEXT PRIMARY KEY,
      p256dh TEXT NOT NULL,
      auth TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
}
