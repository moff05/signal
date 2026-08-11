import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { ensureMigrated } from '@/lib/ensureMigrated';
import { saveAttachment } from '@/lib/attachments';
import { pushToGoogleCalendar, updateGoogleCalendarEvent, deleteGoogleCalendarEvent } from '@/lib/googleCalendar';
import { advanceDate, advanceDueDate } from '@/lib/repeat';
import { computeStreakStats, nextMilestoneHit } from '@/lib/streak';
import { sendPushToAll } from '@/lib/webPush';
import type { RepeatInterval, SignalRow } from '@/lib/urgency';

type Params = { params: Promise<{ id: string }> };

function normalizeRepeat(value: unknown, fallback: RepeatInterval): RepeatInterval {
  return value === 'weekly' || value === 'monthly' || value === 'none' ? value : fallback;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  await ensureMigrated();
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
  let sortOrder: number | null;
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
    sortOrder = existing.sort_order as number | null;

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
    status = body.status === 'done' || body.status === 'active' || body.status === 'deleted' ? body.status : (existing.status as string);
    repeat = normalizeRepeat(body.repeat, existing.repeat as RepeatInterval);
    // Leaving today's Signal clears any manual position — re-flagging later
    // starts fresh at the end rather than resurrecting a stale slot.
    sortOrder = 'sort_order' in body ? body.sort_order : isTodaySignal === 0 ? null : (existing.sort_order as number | null);
    attachmentUrl = undefined;
  }

  const type = eventDatetime ? 'fixed_time' : dueDate ? 'deadline' : 'someday';
  const justCompleted = status === 'done' && existing.status !== 'done';
  const completedAt = justCompleted ? new Date().toISOString() : status === 'active' ? null : existing.completed_at;
  const justDeleted = status === 'deleted' && existing.status !== 'deleted';
  const deletedAt = justDeleted ? new Date().toISOString() : status !== 'deleted' ? null : existing.deleted_at;

  await db.execute({
    sql: `UPDATE signals SET text = ?, type = ?, event_datetime = ?, due_date = ?, is_today_signal = ?, status = ?, completed_at = ?, deleted_at = ?, repeat = ?, sort_order = ?${attachmentUrl !== undefined ? ', attachment_url = ?' : ''}
          WHERE id = ?`,
    args: [
      text,
      type,
      type === 'fixed_time' ? eventDatetime : null,
      type === 'deadline' ? dueDate : null,
      isTodaySignal,
      status,
      completedAt,
      deletedAt,
      type === 'someday' ? 'none' : repeat,
      sortOrder,
      ...(attachmentUrl !== undefined ? [attachmentUrl] : []),
      id,
    ],
  });

  // Deleting (soft) always drops any linked calendar event, regardless of
  // type — a deleted signal has no business still occupying a calendar slot.
  if (status === 'deleted') {
    if (existing.gcal_event_id) {
      await deleteGoogleCalendarEvent(existing.gcal_event_id as string);
      await db.execute({ sql: 'UPDATE signals SET gcal_event_id = NULL WHERE id = ?', args: [id] });
    }
  } else if (type === 'fixed_time' && eventDatetime) {
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
    const newDueDate = type === 'deadline' && dueDate ? advanceDueDate(dueDate, repeat) : null;

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

  // A rare, positive ping at real milestones — the daily reminder cron is all
  // stick ("you haven't picked today's Signal"); this is the one carrot,
  // fired right at the moment it's earned rather than on a fixed schedule.
  // Best-effort: a missing VAPID config or a send failure must never block
  // the actual completion this request exists to record.
  if (justCompleted) {
    try {
      const doneRows = await db.execute(`SELECT status, completed_at FROM signals WHERE status = 'done'`);
      const stats = computeStreakStats(doneRows.rows as unknown as SignalRow[]);
      const milestone = nextMilestoneHit(stats.current);
      if (milestone) {
        await sendPushToAll({ title: `${milestone}-day streak`, body: `You've completed a signal ${milestone} days in a row.` });
      }
    } catch (err) {
      console.error('Milestone push failed:', err);
    }
  }

  const result = await db.execute({ sql: 'SELECT * FROM signals WHERE id = ?', args: [id] });
  return NextResponse.json({ signal: result.rows[0] });
}

export async function DELETE(_request: NextRequest, { params }: Params) {
  await ensureMigrated();
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
