import { getAccessToken } from '@/lib/googleAuth';

const CALENDAR_API = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

// One-way push only: Signal -> Google Calendar. Nothing ever reads back from
// Calendar. All three functions are safe no-ops (return null / do nothing)
// until /settings has completed the OAuth connect flow.
export async function pushToGoogleCalendar(args: { id: string; text: string; eventDatetime: string }): Promise<string | null> {
  const accessToken = await getAccessToken();
  if (!accessToken) return null;

  const res = await fetch(CALENDAR_API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary: args.text,
      start: { dateTime: args.eventDatetime },
      end: { dateTime: new Date(new Date(args.eventDatetime).getTime() + 30 * 60 * 1000).toISOString() },
    }),
  });
  if (!res.ok) {
    console.error('Google Calendar insert failed:', await res.text());
    return null;
  }
  const data = await res.json();
  return data.id as string;
}

export async function updateGoogleCalendarEvent(args: { eventId: string; text: string; eventDatetime: string }): Promise<void> {
  const accessToken = await getAccessToken();
  if (!accessToken) return;

  const res = await fetch(`${CALENDAR_API}/${args.eventId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary: args.text,
      start: { dateTime: args.eventDatetime },
      end: { dateTime: new Date(new Date(args.eventDatetime).getTime() + 30 * 60 * 1000).toISOString() },
    }),
  });
  if (!res.ok) console.error('Google Calendar update failed:', await res.text());
}

export async function deleteGoogleCalendarEvent(eventId: string): Promise<void> {
  const accessToken = await getAccessToken();
  if (!accessToken) return;

  const res = await fetch(`${CALENDAR_API}/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  // 404/410 just means it was already removed on the Google side — not an error for us.
  if (!res.ok && res.status !== 404 && res.status !== 410) {
    console.error('Google Calendar delete failed:', await res.text());
  }
}
