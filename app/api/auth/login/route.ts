import { NextRequest, NextResponse } from 'next/server';
import { isValidPasscode, sessionToken, SESSION_COOKIE } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const { passcode } = await request.json();

  if (typeof passcode !== 'string' || !isValidPasscode(passcode)) {
    return NextResponse.json({ error: 'Incorrect passcode' }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, sessionToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
    path: '/',
  });
  return response;
}
