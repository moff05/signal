import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getAccessToken } from '@/lib/googleAuth';

export async function GET() {
  const db = getDb();
  const result = await db.execute('SELECT id FROM google_auth WHERE id = 1');
  // A row existing only means a connect flow was completed at some point —
  // Google's refresh tokens can still expire/revoke silently (e.g. the OAuth
  // consent screen sitting in "Testing" mode caps them at 7 days), so treat
  // "connected" as "can I actually get an access token right now."
  const connected = result.rows.length > 0 && (await getAccessToken()) !== null;
  return NextResponse.json({ connected });
}
