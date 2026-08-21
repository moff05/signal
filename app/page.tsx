'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Plus, Radio, Archive, Flag, Settings, Search, X, AlertTriangle, Flame } from 'lucide-react';
import { urgencyScore, type SignalRow } from '@/lib/urgency';
import { computeStreakStats } from '@/lib/streak';
import SignalCard from '@/app/components/SignalCard';
import SignalSheet from '@/app/components/SignalSheet';

export default function Home() {
  const [signals, setSignals] = useState<SignalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<SignalRow | null>(null);
  const [query, setQuery] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);
  const errorTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [streak, setStreak] = useState<ReturnType<typeof computeStreakStats> | null>(null);

  // Optimistic updates apply instantly; a failed request quietly looked
  // identical to a successful one before this. Roll back to the pre-action
  // state and say so — silence here is exactly the failure mode this app
  // exists to eliminate.
  function flagError(message: string) {
    setActionError(message);
    if (errorTimeout.current) clearTimeout(errorTimeout.current);
    errorTimeout.current = setTimeout(() => setActionError(null), 4000);
  }

  const load = useCallback(async () => {
    const [activeRes, doneRes] = await Promise.all([fetch('/api/signals'), fetch('/api/signals?status=done')]);
    const [activeData, doneData] = await Promise.all([activeRes.json(), doneRes.json()]);
    setSignals(activeData.signals ?? []);
    setStreak(computeStreakStats(doneData.signals ?? []));
    setLoading(false);
  }, []);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const [activeRes, doneRes] = await Promise.all([fetch('/api/signals'), fetch('/api/signals?status=done')]);
      const [activeData, doneData] = await Promise.all([activeRes.json(), doneRes.json()]);
      if (!ignore) {
        setSignals(activeData.signals ?? []);
        setStreak(computeStreakStats(doneData.signals ?? []));
        setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  async function toggleSignal(id: string, next: boolean) {
    const prev = signals;
    setSignals((p) => p.map((s) => (s.id === id ? { ...s, is_today_signal: next ? 1 : 0 } : s)));
    const res = await fetch(`/api/signals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_today_signal: next }),
    });
    if (!res.ok) {
      setSignals(prev);
      flagError("Couldn't update — try again.");
    }
  }

  async function markDone(id: string) {
    const prev = signals;
    setSignals((p) => p.filter((s) => s.id !== id));
    const res = await fetch(`/api/signals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'done' }),
    });
    if (!res.ok) {
      setSignals(prev);
      flagError("Couldn't mark done — try again.");
      return;
    }
    // Completing something can move the streak — refresh just that, not the
    // whole active list (already updated optimistically above).
    const doneData = await (await fetch('/api/signals?status=done')).json();
    setStreak(computeStreakStats(doneData.signals ?? []));
  }

  // Re-numbers the current visual order into clean sequential integers and
  // persists all of it — simpler and more robust than tracking incremental
  // diffs, and cheap since today's Signal is only ever a handful of items.
  async function moveInToday(id: string, direction: 'up' | 'down') {
    const ordered = [...todaysSignal];
    const idx = ordered.findIndex((s) => s.id === id);
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (idx === -1 || swapIdx < 0 || swapIdx >= ordered.length) return;
    [ordered[idx], ordered[swapIdx]] = [ordered[swapIdx], ordered[idx]];

    const updates = ordered.map((s, i) => ({ id: s.id, sort_order: i }));
    const prev = signals;
    setSignals((p) =>
      p.map((s) => {
        const u = updates.find((x) => x.id === s.id);
        return u ? { ...s, sort_order: u.sort_order } : s;
      })
    );
    const results = await Promise.all(
      updates.map((u) =>
        fetch(`/api/signals/${u.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sort_order: u.sort_order }),
        })
      )
    );
    if (results.some((r) => !r.ok)) {
      setSignals(prev);
      flagError("Couldn't reorder — try again.");
    }
  }

  async function deleteSignal(id: string) {
    const prev = signals;
    setSignals((p) => p.filter((s) => s.id !== id));
    const res = await fetch(`/api/signals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'deleted' }),
    });
    if (!res.ok) {
      setSignals(prev);
      flagError("Couldn't delete — try again.");
    }
  }

  function openEdit(signal: SignalRow) {
    setEditing(signal);
    setSheetOpen(true);
  }

  function openNew() {
    setEditing(null);
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
    setEditing(null);
  }

  async function handleSaved() {
    closeSheet();
    await load();
  }

  const trimmedQuery = query.trim().toLowerCase();
  const searchResults = trimmedQuery
    ? signals.filter((s) => s.text.toLowerCase().includes(trimmedQuery) || (s.details ?? '').toLowerCase().includes(trimmedQuery))
    : null;

  // Manually reordered items sort by that order; anything never touched
  // (sort_order null) falls back to computed urgency and sinks after any
  // manually-positioned items — matches how a fresh flag lands at the end.
  const todaysSignal = signals
    .filter((s) => s.is_today_signal)
    .sort((a, b) => {
      if (a.sort_order != null && b.sort_order != null) return a.sort_order - b.sort_order;
      if (a.sort_order != null) return -1;
      if (b.sort_order != null) return 1;
      return urgencyScore(b) - urgencyScore(a);
    });
  const rest = signals.filter((s) => !s.is_today_signal);
  let cardIndex = 0;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-4 pb-28 pt-8">
      <header className="mb-6 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Radio size={20} strokeWidth={2.25} style={{ color: 'var(--accent)' }} />
          <h1 className="text-2xl font-semibold tracking-tight">Signal</h1>
        </div>
        <div className="flex items-center gap-1">
          <Link
            href="/settings"
            aria-label="Settings"
            className="flex h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-90"
            style={{ color: 'var(--text-muted)' }}
          >
            <Settings size={19} strokeWidth={2} />
          </Link>
          <Link
            href="/archive"
            aria-label="Archive"
            className="flex h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-90"
            style={{ color: 'var(--text-muted)' }}
          >
            <Archive size={19} strokeWidth={2} />
          </Link>
        </div>
      </header>

      {!loading && streak && (streak.current > 0 || streak.weekCount > 0) && (
        <div className="mb-4 flex items-center gap-2.5 text-sm" style={{ color: 'var(--text-muted)' }}>
          <span className="flex items-center gap-1">
            <Flame size={14} strokeWidth={2.25} style={{ color: streak.current > 0 ? 'var(--signal)' : 'var(--text-muted)' }} />
            {streak.current > 0 ? `${streak.current} day streak` : 'No streak yet'}
          </span>
          {streak.longest > streak.current && (
            <>
              <span aria-hidden="true">·</span>
              <span>best {streak.longest}</span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <span>{streak.weekCount}/7 this week</span>
        </div>
      )}

      {actionError && (
        <div
          role="alert"
          className="mb-4 flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm"
          style={{ background: 'var(--urgent-soft)', color: 'var(--urgent)' }}
        >
          <AlertTriangle size={14} strokeWidth={2.5} />
          {actionError}
        </div>
      )}

      {!loading && signals.length > 8 && (
        <div className="relative mb-4">
          <Search size={15} strokeWidth={2.25} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search"
            className="w-full rounded-lg border py-2.5 pl-9 pr-9 text-sm"
            style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full"
              style={{ color: 'var(--text-muted)' }}
            >
              <X size={14} strokeWidth={2.25} />
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }} />
          ))}
        </div>
      ) : signals.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-14 text-center" style={{ borderColor: 'var(--border)' }}>
          <Radio size={22} strokeWidth={1.75} style={{ color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-muted)' }}>Nothing yet.</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Tap New Signal below to add your first one.</p>
        </div>
      ) : searchResults !== null ? (
        <div className="flex flex-col gap-2">
          {searchResults.length > 0 ? (
            searchResults.map((s) => (
              <SignalCard
                key={s.id}
                signal={s}
                onToggleSignal={toggleSignal}
                onMarkDone={markDone}
                onEdit={openEdit}
                onDelete={deleteSignal}
                style={{ animationDelay: `${cardIndex++ * 40}ms` }}
              />
            ))
          ) : (
            <p className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              No matches for “{query}.”
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--signal)' }}>
              Today&apos;s signal
            </h2>
            {todaysSignal.length > 0 ? (
              todaysSignal.map((s, i) => (
                <SignalCard
                  key={s.id}
                  signal={s}
                  onToggleSignal={toggleSignal}
                  onMarkDone={markDone}
                  onEdit={openEdit}
                  onDelete={deleteSignal}
                  style={{ animationDelay: `${cardIndex++ * 40}ms` }}
                  reorder={
                    todaysSignal.length > 1
                      ? {
                          canMoveUp: i > 0,
                          canMoveDown: i < todaysSignal.length - 1,
                          onMoveUp: () => moveInToday(s.id, 'up'),
                          onMoveDown: () => moveInToday(s.id, 'down'),
                        }
                      : undefined
                  }
                />
              ))
            ) : (
              <div className="flex items-center gap-2 rounded-xl border border-dashed px-3 py-3 text-sm" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
                <Flag size={15} strokeWidth={2} />
                Nothing chosen yet — tap the flag on something below.
              </div>
            )}
          </section>

          {rest.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                Backlog
              </h2>
              {rest.map((s) => (
                <SignalCard
                  key={s.id}
                  signal={s}
                  onToggleSignal={toggleSignal}
                  onMarkDone={markDone}
                  onEdit={openEdit}
                  onDelete={deleteSignal}
                  style={{ animationDelay: `${cardIndex++ * 40}ms` }}
                />
              ))}
            </section>
          )}
        </div>
      )}

      <button
        onClick={openNew}
        className="fixed left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full px-6 py-3.5 font-medium text-white transition-transform active:scale-95"
        style={{
          background: 'var(--accent-fill)',
          bottom: 'calc(env(safe-area-inset-bottom) + 1.5rem)',
          boxShadow: '0 10px 30px -8px var(--accent-fill)',
        }}
      >
        <Plus size={18} strokeWidth={2.5} />
        New Signal
      </button>

      {sheetOpen && <SignalSheet initial={editing} onClose={closeSheet} onSaved={handleSaved} />}
    </div>
  );
}
