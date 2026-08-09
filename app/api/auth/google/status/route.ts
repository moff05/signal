import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  const db = getDb();
  const result = await db.execute('SELECT id FROM google_auth WHERE id = 1');
  return NextResponse.json({ connected: result.rows.length > 0 });
}
