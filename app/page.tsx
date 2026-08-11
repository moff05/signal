'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Plus, Radio, Archive, Flag, Settings, Search, X, AlertTriangle } from 'lucide-react';
import type { SignalRow } from '@/lib/urgency';
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
    const res = await fetch('/api/signals');
    const data = await res.json();
    setSignals(data.signals ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const res = await fetch('/api/signals');
      const data = await res.json();
      if (!ignore) {
        setSignals(data.signals ?? []);
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

  const todaysSignal = signals.filter((s) => s.is_today_signal);
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
              todaysSignal.map((s) => (
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
