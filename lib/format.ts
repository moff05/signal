import { format, formatDistanceToNow, isPast } from 'date-fns';
import { parseDueDate, type SignalRow } from '@/lib/urgency';

export function formatSignalDate(row: SignalRow): string | null {
  if (row.type === 'fixed_time' && row.event_datetime) {
    const date = new Date(row.event_datetime);
    return format(date, 'EEE MMM d, h:mm a');
  }
  if (row.type === 'deadline' && row.due_date) {
    const date = parseDueDate(row.due_date);
    const overdue = isPast(date);
    // A specific time was set — show it precisely instead of a vague relative
    // distance, same as a fixed-time event.
    if (row.due_date.length > 10) {
      return `${overdue ? 'Overdue' : 'Due'} ${format(date, 'EEE MMM d, h:mm a')}`;
    }
    return `${overdue ? 'Overdue' : 'Due'} ${formatDistanceToNow(date, { addSuffix: true })}`;
  }
  return null;
}

export function formatCompletedDate(completedAt: string | null): string {
  if (!completedAt) return '';
  return `Completed ${formatDistanceToNow(new Date(completedAt), { addSuffix: true })}`;
}

export function formatRemovedDate(deletedAt: string | null): string {
  if (!deletedAt) return '';
  return `Removed ${formatDistanceToNow(new Date(deletedAt), { addSuffix: true })}`;
}
