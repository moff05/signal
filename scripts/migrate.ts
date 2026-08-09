import { getDb } from '../lib/db';

async function columnExists(db: ReturnType<typeof getDb>, table: string, column: string) {
  const result = await db.execute(`PRAGMA table_info(${table})`);
  return result.rows.some((row) => row.name === column);
}

async function migrate() {
  const db = getDb();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS signals (
      id TEXT PRIMARY KEY,
      text TEXT NOT NULL,
      attachment_url TEXT,
      type TEXT NOT NULL CHECK(type IN ('fixed_time','deadline','someday')),
      event_datetime TEXT,
      due_date TEXT,
      is_today_signal INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','done')),
      gcal_event_id TEXT,
      details TEXT,
      repeat TEXT NOT NULL DEFAULT 'none' CHECK(repeat IN ('none','weekly','monthly')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
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

  console.log('Migration complete.');
}

migrate().catch((err) => {
  console.error(err);
  process.exit(1);
});
