export type SignalType = 'fixed_time' | 'deadline' | 'someday';
export type RepeatInterval = 'none' | 'weekly' | 'monthly';

export type SignalRow = {
  id: string;
  text: string;
  attachment_url: string | null;
  type: SignalType;
  event_datetime: string | null;
  due_date: string | null;
  is_today_signal: number;
  status: 'active' | 'done' | 'deleted';
  gcal_event_id: string | null;
  details: string | null;
  repeat: RepeatInterval;
  created_at: string;
  completed_at: string | null;
  deleted_at: string | null;
  sort_order: number | null;
};

// Someday items have no date, so they always sink below anything with one —
// this constant just needs to be lower than any realistic -hoursUntil value.
const SOMEDAY_SCORE = -1e9;

// due_date is either a bare "YYYY-MM-DD" (no time chosen) or a full
// "YYYY-MM-DDTHH:MM" (an optional time was set in the sheet). A bare date
// string is parsed by JS as UTC midnight — often hours before local midnight,
// and always the literal start of the day rather than what "due tomorrow"
// actually means. Treat a date with no time as due at the end of that day,
// local time, so "tomorrow" doesn't count as already-basically-here.
export function parseDueDate(dueDate: string): Date {
  return dueDate.length === 10 ? new Date(`${dueDate}T23:59:59`) : new Date(dueDate);
}

// Higher score = more urgent = sorted first. Overdue/imminent dated items
// score highest; someday items float at the bottom regardless of how old
// they are, since "no date" should never accidentally out-rank a real date.
export function urgencyScore(row: SignalRow, now: Date = new Date()): number {
  if (row.type === 'someday') return SOMEDAY_SCORE;
  const relevantDate = row.type === 'fixed_time' ? row.event_datetime : row.due_date;
  if (!relevantDate) return SOMEDAY_SCORE;
  const date = row.type === 'deadline' ? parseDueDate(relevantDate) : new Date(relevantDate);
  const hoursUntil = (date.getTime() - now.getTime()) / (1000 * 60 * 60);
  return -hoursUntil;
}

// "Urgent" is never a manual choice — it's computed purely from how close the
// date is, so it climbs on its own (e.g. the Wednesday-noon gift drop-off)
// without anyone having to remember to tap it.
export function isAutoUrgent(row: SignalRow, now: Date = new Date()): boolean {
  if (row.type === 'fixed_time' && row.event_datetime) {
    const hoursUntil = (new Date(row.event_datetime).getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntil <= 24;
  }
  if (row.type === 'deadline' && row.due_date) {
    const hoursUntil = (parseDueDate(row.due_date).getTime() - now.getTime()) / (1000 * 60 * 60);
    return hoursUntil <= 48;
  }
  return false;
}

export function sortSignals(rows: SignalRow[], now: Date = new Date()): SignalRow[] {
  return [...rows].sort((a, b) => {
    const diff = urgencyScore(b, now) - urgencyScore(a, now);
    if (diff !== 0) return diff;
    return a.created_at.localeCompare(b.created_at);
  });
}
