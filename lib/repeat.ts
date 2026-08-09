import { addWeeks, addMonths } from 'date-fns';
import type { RepeatInterval } from '@/lib/urgency';

export function advanceDate(iso: string, interval: RepeatInterval): string {
  const date = new Date(iso);
  const advanced = interval === 'weekly' ? addWeeks(date, 1) : addMonths(date, 1);
  return advanced.toISOString();
}
