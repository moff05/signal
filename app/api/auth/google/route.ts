import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/lib/googleAuth';

export async function GET(request: NextRequest) {
  const redirectUri = `${request.nextUrl.origin}/api/auth/google/callback`;
  return NextResponse.redirect(getAuthUrl(redirectUri));
}
