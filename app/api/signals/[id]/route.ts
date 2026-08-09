import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { saveAttachment } from '@/lib/attachments';
import { pushToGoogleCalendar, updateGoogleCalendarEvent, deleteGoogleCalendarEvent } from '@/lib/googleCalendar';
import { advanceDate } from '@/lib/repeat';
import type { RepeatInterval } from '@/lib/urgency';

type Params = { params: Promise<{ id: string }> };

function normalizeRepeat(value: unknown, fallback: RepeatInterval): RepeatInterval {
  return value === 'weekly' || value === 'monthly' || value === 'none' ? value : fallback;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const db = getDb();

  const existingResult = await db.execute({ sql: 'SELECT * FROM signals WHERE id = ?', args: [id] });
  const existing = existingResult.rows[0];
  if (!existing) {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const isFormData = (request.headers.get('content-type') ?? '').includes('multipart/form-data');

  let text: string;
  let eventDatetime: string | null;
  let dueDate: string | null;
  let isTodaySignal: number;
  let status: string;
  let repeat: RepeatInterval;
  let attachmentUrl: string | null | undefined; // undefined = leave unchanged

  if (isFormData) {
    // Only the edit sheet posts multipart — the only path that ever touches attachments.
    const form = await request.formData();
    const textField = form.get('text');
    text = typeof textField === 'string' && textField.trim() ? textField.trim() : (existing.text as string);
    eventDatetime = form.has('event_datetime') ? (form.get('event_datetime') as string) || null : (existing.event_datetime as string | null);
    dueDate = form.has('due_date') ? (form.get('due_date') as string) || null : (existing.due_date as string | null);
    isTodaySignal = existing.is_today_signal as number;
    status = existing.status as string;
    repeat = normalizeRepeat(form.get('repeat'), existing.repeat as RepeatInterval);

    const attachment = form.get('attachment');
    if (attachment instanceof File && attachment.size > 0) {
      attachmentUrl = await saveAttachment(attachment);
    } else if (form.get('remove_attachment') === 'true') {
      attachmentUrl = null;
    } else {
      attachmentUrl = undefined;
    }
  } else {
    const body = await request.json();
    text = typeof body.text === 'string' ? body.text.trim() : (existing.text as string);
    eventDatetime = 'event_datetime' in body ? body.event_datetime : existing.event_datetime;
    dueDate = 'due_date' in body ? body.due_date : existing.due_date;
    isTodaySignal = typeof body.is_today_signal === 'boolean' ? (body.is_today_signal ? 1 : 0) : (existing.is_today_signal as number);
    status = body.status === 'done' || body.status === 'active' ? body.status : (existing.status as string);
    repeat = normalizeRepeat(body.repeat, existing.repeat as RepeatInterval);
    attachmentUrl = undefined;
  }

  const type = eventDatetime ? 'fixed_time' : dueDate ? 'deadline' : 'someday';
  const justCompleted = status === 'done' && existing.status !== 'done';
  const completedAt = justCompleted ? new Date().toISOString() : status === 'active' ? null : existing.completed_at;

  await db.execute({
    sql: `UPDATE signals SET text = ?, type = ?, event_datetime = ?, due_date = ?, is_today_signal = ?, status = ?, completed_at = ?, repeat = ?${attachmentUrl !== undefined ? ', attachment_url = ?' : ''}
          WHERE id = ?`,
    args: [
      text,
      type,
      type === 'fixed_time' ? eventDatetime : null,
      type === 'deadline' ? dueDate : null,
      isTodaySignal,
      status,
      completedAt,
      type === 'someday' ? 'none' : repeat,
      ...(attachmentUrl !== undefined ? [attachmentUrl] : []),
      id,
    ],
  });

  if (type === 'fixed_time' && eventDatetime) {
    if (existing.gcal_event_id) {
      await updateGoogleCalendarEvent({ eventId: existing.gcal_event_id as string, text, eventDatetime });
    } else {
      const gcalEventId = await pushToGoogleCalendar({ id, text, eventDatetime });
      if (gcalEventId) {
        await db.execute({ sql: 'UPDATE signals SET gcal_event_id = ? WHERE id = ?', args: [gcalEventId, id] });
      }
    }
  } else if (existing.gcal_event_id) {
    await deleteGoogleCalendarEvent(existing.gcal_event_id as string);
    await db.execute({ sql: 'UPDATE signals SET gcal_event_id = NULL WHERE id = ?', args: [id] });
  }

  // Recurring: completing a repeating deadline/fixed-time signal spawns a
  // fresh copy with the date advanced, instead of the obligation just
  // vanishing into the archive for good.
  if (justCompleted && repeat !== 'none' && (type === 'deadline' || type === 'fixed_time')) {
    const newId = crypto.randomUUID();
    const newEventDatetime = type === 'fixed_time' && eventDatetime ? advanceDate(eventDatetime, repeat) : null;
    const newDueDate = type === 'deadline' && dueDate ? advanceDate(dueDate, repeat).slice(0, 10) : null;

    await db.execute({
      sql: `INSERT INTO signals (id, text, type, event_datetime, due_date, repeat)
            VALUES (?, ?, ?, ?, ?, ?)`,
      args: [newId, text, type, newEventDatetime, newDueDate, repeat],
    });

    if (type === 'fixed_time' && newEventDatetime) {
      const gcalEventId = await pushToGoogleCalendar({ id: newId, text, eventDatetime: newEventDatetime });
      if (gcalEventId) {
        await db.execute({ sql: 'UPDATE signals SET gcal_event_id = ? WHERE id = ?', args: [gcalEventId, newId] });
      }
    }
  }

  const result = await db.execute({ sql: 'SELECT * FROM signals WHERE id = ?', args: [id] });
  return NextResponse.json({ signal: result.rows[0] });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const db = getDb();

  const existingResult = await db.execute({ sql: 'SELECT gcal_event_id FROM signals WHERE id = ?', args: [id] });
  const existing = existingResult.rows[0];
  if (existing?.gcal_event_id) {
    await deleteGoogleCalendarEvent(existing.gcal_event_id as string);
  }

  await db.execute({ sql: 'DELETE FROM signals WHERE id = ?', args: [id] });
  return NextResponse.json({ ok: true });
}
