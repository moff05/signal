import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureMigrated } from '@/lib/ensureMigrated';
import { sendPushToAll } from '@/lib/webPush';

// Triggered by Vercel Cron (see vercel.json) — not user-facing, so it's
// excluded from the passcode gate in proxy.ts and authenticated with
// CRON_SECRET instead, matching Vercel's documented cron-auth pattern.
export async function GET(request: NextRequest) {
  const auth = request.headers.get('authorization');
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  await ensureMigrated();
  const db = getDb();
  const result = await db.execute(
    `SELECT id FROM signals WHERE status = 'active' AND is_today_signal = 1`
  );

  if (result.rows.length > 0) {
    return NextResponse.json({ sent: false, reason: 'signal already set' });
  }

  await sendPushToAll({ title: 'Pick today’s 3–5', body: 'You haven’t set today’s Signal yet.' });
  return NextResponse.json({ sent: true });
}
