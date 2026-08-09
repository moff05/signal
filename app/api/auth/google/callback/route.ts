import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { exchangeCodeForRefreshToken } from '@/lib/googleAuth';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  if (!code) {
    return NextResponse.redirect(new URL('/settings?google=error', request.url));
  }

  try {
    const redirectUri = `${request.nextUrl.origin}/api/auth/google/callback`;
    const refreshToken = await exchangeCodeForRefreshToken(code, redirectUri);

    const db = getDb();
    await db.execute({
      sql: `INSERT INTO google_auth (id, refresh_token) VALUES (1, ?)
            ON CONFLICT(id) DO UPDATE SET refresh_token = excluded.refresh_token`,
      args: [refreshToken],
    });

    return NextResponse.redirect(new URL('/settings?google=connected', request.url));
  } catch (err) {
    console.error('Google OAuth callback failed:', err);
    return NextResponse.redirect(new URL('/settings?google=error', request.url));
  }
}
