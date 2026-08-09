import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { saveAttachment } from '@/lib/attachments';
import { sortSignals, type SignalRow } from '@/lib/urgency';
import { pushToGoogleCalendar } from '@/lib/googleCalendar';
import { summarizeToTitle } from '@/lib/groq';

// Past this length (or line count), free-form text gets AI-condensed into a
// title with the original kept as expandable details — short quick-capture
// entries skip the AI call entirely and stay instant.
const SUMMARIZE_LENGTH_THRESHOLD = 100;
const SUMMARIZE_LINE_THRESHOLD = 2;

function needsSummary(text: string): boolean {
  return text.length > SUMMARIZE_LENGTH_THRESHOLD || text.split('\n').length > SUMMARIZE_LINE_THRESHOLD;
}

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get('status') ?? 'active';
  const db = getDb();

  const result =
    status === 'all'
      ? await db.execute('SELECT * FROM signals')
      : await db.execute({ sql: 'SELECT * FROM signals WHERE status = ?', args: [status] });

  const rows = result.rows as unknown as SignalRow[];
  return NextResponse.json({ signals: sortSignals(rows) });
}

export async function POST(request: NextRequest) {
  const form = await request.formData();
  const text = form.get('text');
  if (typeof text !== 'string' || !text.trim()) {
    return NextResponse.json({ error: 'text is required' }, { status: 400 });
  }

  const eventDatetime = form.get('event_datetime');
  const dueDate = form.get('due_date');
  const attachment = form.get('attachment');
  const repeatInput = form.get('repeat');
  const repeat = repeatInput === 'weekly' || repeatInput === 'monthly' ? repeatInput : 'none';

  const type = typeof eventDatetime === 'string' && eventDatetime ? 'fixed_time' : typeof dueDate === 'string' && dueDate ? 'deadline' : 'someday';

  let attachmentUrl: string | null = null;
  if (attachment instanceof File && attachment.size > 0) {
    attachmentUrl = await saveAttachment(attachment);
  }

  const trimmedText = text.trim();
  let title = trimmedText;
  let details: string | null = null;
  if (needsSummary(trimmedText)) {
    title = await summarizeToTitle(trimmedText);
    details = trimmedText;
  }

  const id = crypto.randomUUID();
  const db = getDb();

  // is_today_signal always starts false — that's a triage decision made
  // later, not at capture time (see PRODUCT.md design principles).
  await db.execute({
    sql: `INSERT INTO signals (id, text, details, attachment_url, type, event_datetime, due_date, repeat)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      id,
      title,
      details,
      attachmentUrl,
      type,
      type === 'fixed_time' ? (eventDatetime as string) : null,
      type === 'deadline' ? (dueDate as string) : null,
      type === 'someday' ? 'none' : repeat,
    ],
  });

  let gcalEventId: string | null = null;
  if (type === 'fixed_time') {
    gcalEventId = await pushToGoogleCalendar({ id, text: title, eventDatetime: eventDatetime as string });
    if (gcalEventId) {
      await db.execute({ sql: 'UPDATE signals SET gcal_event_id = ? WHERE id = ?', args: [gcalEventId, id] });
    }
  }

  const result = await db.execute({ sql: 'SELECT * FROM signals WHERE id = ?', args: [id] });
  return NextResponse.json({ signal: result.rows[0] }, { status: 201 });
}
