import { subDays, isSameDay, startOfDay } from 'date-fns';
import type { SignalRow } from '@/lib/urgency';

export type StreakStats = {
  // Consecutive days ending today (or yesterday, if today has no completion
  // yet — an in-progress day shouldn't read as a broken streak). Tolerates
  // one gap day per run rather than resetting to zero on the first miss —
  // otherwise the entire incentive to keep going evaporates the moment a
  // streak breaks, which defeats the point of tracking it at all.
  current: number;
  // Out of the last 7 days, how many had at least one completion. Rolling,
  // not lifetime — a number that reflects recent consistency actually
  // creates pull to open the app today, unlike a total that only grows.
  weekCount: number;
  // Individual signals completed in the last 7 days — a different axis than
  // weekCount (days active); used for the weekly recap push.
  weeklyCompletedCount: number;
  week: { day: Date; hit: boolean }[];
};

const MILESTONES = [3, 7, 14, 30, 60, 100, 200, 365];

export function nextMilestoneHit(streak: number): number | null {
  return MILESTONES.includes(streak) ? streak : null;
}

export function computeStreakStats(rows: SignalRow[], now: Date = new Date()): StreakStats {
  const completed = rows.filter((r) => r.status === 'done' && r.completed_at);
  const completedDays = completed.map((r) => startOfDay(new Date(r.completed_at as string)));

  function hasCompletionOn(day: Date) {
    return completedDays.some((d) => isSameDay(d, day));
  }

  const week = Array.from({ length: 7 }, (_, i) => {
    const day = subDays(now, 6 - i);
    return { day, hit: hasCompletionOn(day) };
  });
  const weekCount = week.filter((d) => d.hit).length;
  const weekStart = subDays(startOfDay(now), 6);
  const weeklyCompletedCount = completed.filter((r) => new Date(r.completed_at as string) >= weekStart).length;

  // The dot strip above stays a literal per-day record — grace only changes
  // how the streak *number* reads, it never pretends a miss didn't happen.
  let current = 0;
  let cursor = startOfDay(now);
  if (!hasCompletionOn(cursor)) cursor = subDays(cursor, 1);
  let graceUsed = false;
  while (true) {
    if (hasCompletionOn(cursor)) {
      current++;
      cursor = subDays(cursor, 1);
    } else if (!graceUsed) {
      graceUsed = true;
      cursor = subDays(cursor, 1);
    } else {
      break;
    }
  }

  return { current, weekCount, weeklyCompletedCount, week };
}
