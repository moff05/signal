import { subDays, addDays, isSameDay, startOfDay } from 'date-fns';
import type { SignalRow } from '@/lib/urgency';

export type StreakStats = {
  // Consecutive days ending today (or yesterday, if today has no completion
  // yet — an in-progress day shouldn't read as a broken streak). Tolerates
  // one gap day per run rather than resetting to zero on the first miss —
  // otherwise the entire incentive to keep going evaporates the moment a
  // streak breaks, which defeats the point of tracking it at all.
  current: number;
  // Longest run ever recorded, using the same one-grace-day-per-run rule as
  // `current` — so a streak that's still climbing toward its own record
  // reads as `current === longest`, not two disconnected numbers.
  longest: number;
  // Whether the *current* run has already spent its one grace day. False
  // means a miss today would just pause the streak; true means a miss today
  // ends it — used to pick the right words in the at-risk nudge.
  graceAvailable: boolean;
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
  const endCursor = cursor;
  let graceUsed = false;
  // Distinct from graceUsed: the backward walk always peeks one day past the
  // run's actual start to confirm it's over — that peek alone shouldn't read
  // as "grace spent" if no hit day ever came after it. Only a gap that's
  // sandwiched between two hit days (i.e. the walk kept incrementing `current`
  // afterward) is a real in-run pause.
  let graceConsumedWithinRun = false;
  while (true) {
    if (hasCompletionOn(cursor)) {
      current++;
      if (graceUsed) graceConsumedWithinRun = true;
      cursor = subDays(cursor, 1);
    } else if (!graceUsed) {
      graceUsed = true;
      cursor = subDays(cursor, 1);
    } else {
      break;
    }
  }

  const longest = computeLongestStreak(completedDays, endCursor);

  return {
    current,
    longest: Math.max(longest, current),
    graceAvailable: !graceConsumedWithinRun,
    weekCount,
    weeklyCompletedCount,
    week,
  };
}

// Same one-grace-day-per-run rule as the `current` walk above, but scanning
// forward across the whole history to find the best run ever, not just the
// one ending today. Shares `endCursor` with the current-streak walk so an
// ongoing streak that's already the record reads as longest === current,
// rather than the forward and backward walks landing on different endpoints.
function computeLongestStreak(completedDays: Date[], endCursor: Date): number {
  if (completedDays.length === 0) return 0;
  const daySet = new Set(completedDays.map((d) => d.getTime()));
  let cursor = completedDays.reduce((min, d) => (d < min ? d : min));
  let longest = 0;
  let run = 0;
  let graceUsed = false;
  while (cursor <= endCursor) {
    if (daySet.has(cursor.getTime())) {
      run++;
      longest = Math.max(longest, run);
    } else if (!graceUsed) {
      graceUsed = true;
    } else {
      run = 0;
      graceUsed = false;
    }
    cursor = addDays(cursor, 1);
  }
  return longest;
}
