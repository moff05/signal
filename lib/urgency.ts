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
};

// Someday items have no date, so they always sink below anything with one —
// this constant just needs to be lower than any realistic -hoursUntil value.
const SOMEDAY_SCORE = -1e9;

// Higher score = more urgent = sorted first. Overdue/imminent dated items
// score highest; someday items float at the bottom regardless of how old
// they are, since "no date" should never accidentally out-rank a real date.
export function urgencyScore(row: SignalRow, now: Date = new Date()): number {
  const relevantDate = row.type === 'someday' ? null : row.type === 'fixed_time' ? row.event_datetime : row.due_date;
  if (!relevantDate) return SOMEDAY_SCORE;
  const hoursUntil = (new Date(relevantDate).getTime() - now.getTime()) / (1000 * 60 * 60);
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
    const hoursUntil = (new Date(row.due_date).getTime() - now.getTime()) / (1000 * 60 * 60);
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
