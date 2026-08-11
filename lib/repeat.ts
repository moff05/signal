import { addWeeks, addMonths } from 'date-fns';
import { parseDueDate, type RepeatInterval } from '@/lib/urgency';

export function advanceDate(iso: string, interval: RepeatInterval): string {
  const date = new Date(iso);
  const advanced = interval === 'weekly' ? addWeeks(date, 1) : addMonths(date, 1);
  return advanced.toISOString();
}

const pad = (n: number) => String(n).padStart(2, '0');

// due_date is local (either "YYYY-MM-DD" or "YYYY-MM-DDTHH:MM"), unlike
// event_datetime which is a UTC ISO instant — advancing it has to stay in the
// same local, human-legible format rather than round-tripping through
// toISOString(), which would both shift it to UTC and force a time-of-day
// onto a deadline that never had one.
export function advanceDueDate(dueDate: string, interval: RepeatInterval): string {
  const hasTime = dueDate.length > 10;
  const advanced = interval === 'weekly' ? addWeeks(parseDueDate(dueDate), 1) : addMonths(parseDueDate(dueDate), 1);
  const datePart = `${advanced.getFullYear()}-${pad(advanced.getMonth() + 1)}-${pad(advanced.getDate())}`;
  return hasTime ? `${datePart}T${pad(advanced.getHours())}:${pad(advanced.getMinutes())}` : datePart;
}
