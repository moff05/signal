'use client';

import { useState } from 'react';
import { Check, Pencil, Trash2, Flag, AlertTriangle, MoreHorizontal, X, ChevronDown, ChevronUp } from 'lucide-react';
import { isAutoUrgent, type SignalRow } from '@/lib/urgency';
import { formatSignalDate } from '@/lib/format';

const EXIT_DISTANCE = 480;
const EXIT_MS = 260;

type Props = {
  signal: SignalRow;
  onToggleSignal: (id: string, next: boolean) => void;
  onMarkDone: (id: string) => void;
  onEdit: (signal: SignalRow) => void;
  onDelete: (id: string) => void;
  style?: React.CSSProperties;
  // Only meaningful within Today's Signal — the backlog stays purely
  // urgency-sorted, so these are omitted entirely for backlog/search cards.
  reorder?: { canMoveUp: boolean; canMoveDown: boolean; onMoveUp: () => void; onMoveDown: () => void };
};

export default function SignalCard({ signal, onToggleSignal, onMarkDone, onEdit, onDelete, style, reorder }: Props) {
  const dateLabel = formatSignalDate(signal);
  const urgent = isAutoUrgent(signal);
  const inSignal = Boolean(signal.is_today_signal);

  const [menuOpen, setMenuOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [offset, setOffset] = useState(0);
  const [exiting, setExiting] = useState(false);

  // Done/Delete still slide the card off and fade before it actually leaves
  // the list, instead of yanking it out mid-tap — just no drag gesture
  // driving it anymore, only the tap itself.
  function exitThen(direction: 'right' | 'left', action: () => void) {
    setExiting(true);
    setOffset(direction === 'right' ? EXIT_DISTANCE : -EXIT_DISTANCE);
    setTimeout(action, EXIT_MS);
  }

  return (
    <div
      className="signal-rise relative overflow-hidden rounded-xl"
      style={{ ...style, opacity: exiting ? 0 : 1, transition: 'opacity 220ms ease' }}
    >
      <div
        style={{
          transform: `translateX(${offset}px)`,
          transition: `transform ${EXIT_MS}ms cubic-bezier(0.16, 1, 0.3, 1)`,
          borderColor: 'var(--border)',
          background: 'var(--surface)',
        }}
        className="relative border p-3"
      >
        <div className="flex items-start gap-3">
          <button
            aria-label={inSignal ? 'In today’s Signal — tap to remove' : 'Add to today’s Signal'}
            onClick={() => onToggleSignal(signal.id, !inSignal)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-transform active:scale-90"
            style={{
              borderColor: inSignal ? 'var(--signal)' : 'var(--border)',
              background: inSignal ? 'var(--signal-soft)' : 'transparent',
            }}
          >
            <Flag size={19} strokeWidth={2.25} style={{ color: inSignal ? 'var(--signal)' : 'var(--text-muted)' }} />
          </button>

          <div className="min-w-0 flex-1 py-1.5">
            <p className="break-words leading-snug">{signal.text}</p>
            {dateLabel && (
              <p className="mt-1 flex items-center gap-1 text-sm" style={{ color: urgent ? 'var(--urgent)' : 'var(--text-muted)' }}>
                {urgent && <AlertTriangle size={12} strokeWidth={2.5} />}
                {dateLabel}
              </p>
            )}
            {signal.attachment_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={signal.attachment_url} alt="" loading="lazy" className="mt-2 max-h-40 rounded-lg border" style={{ borderColor: 'var(--border)' }} />
            )}

            {signal.details && (
              <>
                <button
                  onClick={() => setDetailsOpen((v) => !v)}
                  aria-expanded={detailsOpen}
                  className="mt-1.5 flex items-center gap-1 text-sm font-medium"
                  style={{ color: 'var(--accent)' }}
                >
                  <ChevronDown size={14} strokeWidth={2.5} className="transition-transform" style={{ transform: detailsOpen ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                  {detailsOpen ? 'Hide details' : 'Show details'}
                </button>
                <div style={{ display: 'grid', gridTemplateRows: detailsOpen ? '1fr' : '0fr', transition: 'grid-template-rows 200ms cubic-bezier(0.16, 1, 0.3, 1)' }}>
                  <div className="overflow-hidden">
                    <p className="mt-2 whitespace-pre-wrap break-words text-sm" style={{ color: 'var(--text-muted)' }}>
                      {signal.details}
                    </p>
                  </div>
                </div>
              </>
            )}
          </div>

          <button
            aria-label={menuOpen ? 'Close actions' : 'More actions'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="-mr-1.5 -mt-1 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border transition-transform active:scale-90"
            style={{ borderColor: menuOpen ? 'var(--accent)' : 'var(--border)', color: menuOpen ? 'var(--accent)' : 'var(--text-muted)' }}
          >
            {menuOpen ? <X size={19} strokeWidth={2.25} /> : <MoreHorizontal size={19} strokeWidth={2.25} />}
          </button>
        </div>

        <div
          inert={!menuOpen}
          style={{ display: 'grid', gridTemplateRows: menuOpen ? '1fr' : '0fr', transition: 'grid-template-rows 200ms cubic-bezier(0.16, 1, 0.3, 1)' }}
        >
          <div className="overflow-hidden">
            <div className="mt-3 flex gap-2 border-t pt-3" style={{ borderColor: 'var(--border)' }}>
              {reorder && (
                <>
                  <button
                    type="button"
                    disabled={!reorder.canMoveUp}
                    onClick={reorder.onMoveUp}
                    aria-label="Move up in today's Signal"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg active:scale-95 disabled:opacity-30"
                    style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                  >
                    <ChevronUp size={16} strokeWidth={2.5} />
                  </button>
                  <button
                    type="button"
                    disabled={!reorder.canMoveDown}
                    onClick={reorder.onMoveDown}
                    aria-label="Move down in today's Signal"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg active:scale-95 disabled:opacity-30"
                    style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
                  >
                    <ChevronDown size={16} strokeWidth={2.5} />
                  </button>
                </>
              )}
              <button
                onClick={() => exitThen('right', () => onMarkDone(signal.id))}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium active:scale-95"
                style={{ background: 'var(--signal-soft)', color: 'var(--signal)' }}
              >
                <Check size={15} strokeWidth={2.5} />
                Done
              </button>
              <button
                onClick={() => {
                  onEdit(signal);
                  setMenuOpen(false);
                }}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium active:scale-95"
                style={{ background: 'var(--accent-soft)', color: 'var(--accent)' }}
              >
                <Pencil size={14} strokeWidth={2.25} />
                Edit
              </button>
              <button
                onClick={() => exitThen('left', () => onDelete(signal.id))}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-medium active:scale-95"
                style={{ background: 'var(--urgent-soft)', color: 'var(--urgent)' }}
              >
                <Trash2 size={14} strokeWidth={2.25} />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
