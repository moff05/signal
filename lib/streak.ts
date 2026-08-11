import { subDays, isSameDay, startOfDay } from 'date-fns';
import type { SignalRow } from '@/lib/urgency';

export type StreakStats = {
  // Consecutive days ending today (or yesterday, if today has no completion
  // yet — an in-progress day shouldn't read as a broken streak).
  current: number;
  // Out of the last 7 days, how many had at least one completion. Rolling,
  // not lifetime — a number that reflects recent consistency actually
  // creates pull to open the app today, unlike a total that only grows.
  weekCount: number;
  week: { day: Date; hit: boolean }[];
};

const MILESTONES = [3, 7, 14, 30, 60, 100, 200, 365];

export function nextMilestoneHit(streak: number): number | null {
  return MILESTONES.includes(streak) ? streak : null;
}

export function computeStreakStats(rows: SignalRow[], now: Date = new Date()): StreakStats {
  const completedDays = rows
    .filter((r) => r.status === 'done' && r.completed_at)
    .map((r) => startOfDay(new Date(r.completed_at as string)));

  function hasCompletionOn(day: Date) {
    return completedDays.some((d) => isSameDay(d, day));
  }

  const week = Array.from({ length: 7 }, (_, i) => {
    const day = subDays(now, 6 - i);
    return { day, hit: hasCompletionOn(day) };
  });
  const weekCount = week.filter((d) => d.hit).length;

  let current = 0;
  let cursor = startOfDay(now);
  if (!hasCompletionOn(cursor)) cursor = subDays(cursor, 1);
  while (hasCompletionOn(cursor)) {
    current++;
    cursor = subDays(cursor, 1);
  }

  return { current, weekCount, week };
}
