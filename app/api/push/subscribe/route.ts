import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { endpoint, keys } = body ?? {};
  if (!endpoint || !keys?.p256dh || !keys?.auth) {
    return NextResponse.json({ error: 'invalid subscription' }, { status: 400 });
  }

  const db = getDb();
  await db.execute({
    sql: `INSERT INTO push_subscriptions (endpoint, p256dh, auth) VALUES (?, ?, ?)
          ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth`,
    args: [endpoint, keys.p256dh, keys.auth],
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const { endpoint } = await request.json();
  if (!endpoint) return NextResponse.json({ error: 'endpoint required' }, { status: 400 });

  const db = getDb();
  await db.execute({ sql: 'DELETE FROM push_subscriptions WHERE endpoint = ?', args: [endpoint] });
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const db = getDb();
  const result = await db.execute('SELECT endpoint FROM push_subscriptions');
  return NextResponse.json({ subscribed: result.rows.length > 0 });
}
