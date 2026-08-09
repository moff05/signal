import { createHmac, timingSafeEqual } from 'node:crypto';

export const SESSION_COOKIE = 'signal_session';

function secret(): string {
  const value = process.env.AUTH_SECRET;
  if (!value) throw new Error('AUTH_SECRET is not set');
  return value;
}

export function sessionToken(): string {
  return createHmac('sha256', secret()).update('signal-authenticated').digest('hex');
}

export function isValidSession(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;
  const expected = sessionToken();
  const a = Buffer.from(cookieValue);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function isValidPasscode(passcode: string): boolean {
  const expected = process.env.SIGNAL_PASSCODE;
  if (!expected) throw new Error('SIGNAL_PASSCODE is not set');
  const a = Buffer.from(passcode);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export function isValidWidgetToken(token: string | null): boolean {
  const expected = process.env.WIDGET_TOKEN;
  if (!expected || !token) return false;
  const a = Buffer.from(token);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}
