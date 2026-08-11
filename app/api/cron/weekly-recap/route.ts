import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureMigrated } from '@/lib/ensureMigrated';
import { sendPushToAll } from '@/lib/webPush';
import { computeStreakStats } from '@/lib/streak';
import type { SignalRow } from '@/lib/urgency';

// Triggered by Vercel Cron (see vercel.json), same auth pattern as
// daily-reminder. A different cadence from the daily nag — a once-a-week
// step-back moment ("here's what actually happened") rather than another
// "you haven't done X yet" prompt.
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  await ensureMigrated();
  const db = getDb();
  const doneRows = await db.execute(`SELECT status, completed_at FROM signals WHERE status = 'done'`);
  const stats = computeStreakStats(doneRows.rows as unknown as SignalRow[]);

  // Nothing happened this week — silent, same "no nagging" philosophy as
  // the daily reminder staying quiet once you've already flagged something.
  if (stats.weeklyCompletedCount === 0) {
    return NextResponse.json({ sent: false, reason: 'nothing completed this week' });
  }

  const item = stats.weeklyCompletedCount === 1 ? 'signal' : 'signals';
  const streakPart = stats.current > 0 ? `, ${stats.current}-day streak` : '';
  await sendPushToAll({
    title: 'Your week in Signal',
    body: `${stats.weeklyCompletedCount} ${item} completed${streakPart}.`,
  });
  return NextResponse.json({ sent: true });
}
