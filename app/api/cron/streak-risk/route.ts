import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureMigrated } from '@/lib/ensureMigrated';
import { sendPushToAll } from '@/lib/webPush';
import { computeStreakStats } from '@/lib/streak';
import type { SignalRow } from '@/lib/urgency';

// Triggered by Vercel Cron (see vercel.json), same auth pattern as the other
// cron routes. Fires in the evening, only when there's an actual streak on
// the line and nothing has been completed yet today — the one moment a nudge
// is worth an interruption rather than noise.
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  await ensureMigrated();
  const db = getDb();
  const doneRows = await db.execute(`SELECT status, completed_at FROM signals WHERE status = 'done'`);
  const stats = computeStreakStats(doneRows.rows as unknown as SignalRow[]);

  if (stats.current === 0) {
    return NextResponse.json({ sent: false, reason: 'no active streak' });
  }

  // week[6] is today — see the (day: 6-i) construction in computeStreakStats.
  if (stats.week[6].hit) {
    return NextResponse.json({ sent: false, reason: 'already completed today' });
  }

  const body = stats.graceAvailable
    ? `Nothing logged today — miss it and your ${stats.current}-day streak spends its grace day.`
    : `Nothing logged today — miss it and your ${stats.current}-day streak ends. Grace day's already used.`;

  await sendPushToAll({ title: 'Streak at risk', body });
  return NextResponse.json({ sent: true });
}
