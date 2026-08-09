import { getDb } from '@/lib/db';

const SCOPE = 'https://www.googleapis.com/auth/calendar.events';

function credentials() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('GOOGLE_CLIENT_ID/SECRET not set');
  return { clientId, clientSecret };
}

export function getAuthUrl(redirectUri: string): string {
  const { clientId } = credentials();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: SCOPE,
    access_type: 'offline',
    prompt: 'consent',
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeCodeForRefreshToken(code: string, redirectUri: string): Promise<string> {
  const { clientId, clientSecret } = credentials();
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${await res.text()}`);
  const data = await res.json();
  if (!data.refresh_token) throw new Error('No refresh_token returned — revoke app access in your Google account and reconnect to force a fresh consent.');
  return data.refresh_token as string;
}

// Refresh tokens don't expire under normal use, so every call just trades it
// for a short-lived access token — no caching needed at this call volume.
export async function getAccessToken(): Promise<string | null> {
  const db = getDb();
  const result = await db.execute('SELECT refresh_token FROM google_auth WHERE id = 1');
  const refreshToken = result.rows[0]?.refresh_token as string | undefined;
  if (!refreshToken) return null;

  const { clientId, clientSecret } = credentials();
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });
  if (!res.ok) return null;
  const data = await res.json();
  return (data.access_token as string) ?? null;
}
