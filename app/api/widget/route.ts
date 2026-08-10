import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureMigrated } from '@/lib/ensureMigrated';
import { isValidWidgetToken } from '@/lib/auth';
import { sortSignals, type SignalRow } from '@/lib/urgency';
import { formatSignalDate } from '@/lib/format';

// Public route (excluded from proxy auth) — guarded by its own long-lived
// token instead, since the Scriptable widget can't do a cookie-based login.
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (!isValidWidgetToken(token)) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  await ensureMigrated();
  const db = getDb();
  const result = await db.execute({
    sql: `SELECT * FROM signals WHERE status = 'active' AND is_today_signal = 1`,
    args: [],
  });

  const rows = sortSignals(result.rows as unknown as SignalRow[]);
  const signals = rows.slice(0, 5).map((row) => ({
    id: row.id,
    text: row.text,
    dateLabel: formatSignalDate(row),
  }));

  return NextResponse.json({ signals });
}
