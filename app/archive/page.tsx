'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, RotateCcw, Trash2, Archive as ArchiveIcon } from 'lucide-react';
import { subDays, isSameDay, format } from 'date-fns';
import type { SignalRow } from '@/lib/urgency';
import { formatCompletedDate } from '@/lib/format';

export default function ArchivePage() {
  const [items, setItems] = useState<SignalRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const res = await fetch('/api/signals?status=done');
      const data = await res.json();
      if (!ignore) {
        const rows = (data.signals ?? []) as SignalRow[];
        rows.sort((a, b) => (b.completed_at ?? '').localeCompare(a.completed_at ?? ''));
        setItems(rows);
        setLoading(false);
      }
    })();
    return () => {
      ignore = true;
    };
  }, []);

  const streak = useMemo(() => {
    const days = Array.from({ length: 7 }, (_, i) => subDays(new Date(), 6 - i));
    return days.map((day) => ({
      day,
      hit: items.some((item) => item.completed_at && isSameDay(new Date(item.completed_at), day)),
    }));
  }, [items]);

  async function restore(id: string) {
    setItems((prev) => prev.filter((s) => s.id !== id));
    await fetch(`/api/signals/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'active' }),
    });
  }

  async function deleteForever(id: string) {
    setItems((prev) => prev.filter((s) => s.id !== id));
    await fetch(`/api/signals/${id}`, { method: 'DELETE' });
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-4 pb-16 pt-8">
      <header className="mb-6 flex items-center gap-3">
        <Link href="/" aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-full" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={20} strokeWidth={2.25} />
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">Archive</h1>
      </header>

      {!loading && items.length > 0 && (
        <div className="mb-6 flex items-center justify-between rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
          {streak.map(({ day, hit }) => (
            <div key={day.toISOString()} className="flex flex-col items-center gap-1.5">
              <span className="text-[10px] font-medium uppercase" style={{ color: 'var(--text-muted)' }}>
                {format(day, 'EEEEE')}
              </span>
              <div
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: hit ? 'var(--signal)' : 'var(--border)' }}
                aria-label={hit ? `Completed something on ${format(day, 'EEE MMM d')}` : undefined}
              />
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl border" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-14 text-center" style={{ borderColor: 'var(--border)' }}>
          <ArchiveIcon size={22} strokeWidth={1.75} style={{ color: 'var(--text-muted)' }} />
          <p style={{ color: 'var(--text-muted)' }}>Nothing completed yet.</p>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Anything you mark done shows up here — nothing is ever silently lost.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div key={item.id} className="flex items-center gap-3 rounded-xl border p-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
              <div className="min-w-0 flex-1">
                <p className="break-words leading-snug line-through" style={{ color: 'var(--text-muted)' }}>
                  {item.text}
                </p>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                  {formatCompletedDate(item.completed_at)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <button
                  aria-label="Restore"
                  onClick={() => restore(item.id)}
                  className="flex h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-90"
                  style={{ color: 'var(--accent)', background: 'var(--accent-soft)' }}
                >
                  <RotateCcw size={16} strokeWidth={2.25} />
                </button>
                <button
                  aria-label="Delete forever"
                  onClick={() => deleteForever(item.id)}
                  className="flex h-10 w-10 items-center justify-center rounded-full transition-transform active:scale-90"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <Trash2 size={16} strokeWidth={2} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
