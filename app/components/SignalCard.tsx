'use client';

import { useRef, useState } from 'react';
import { Check, Pencil, Trash2, Flag, AlertTriangle, MoreHorizontal, X, ChevronDown } from 'lucide-react';
import { isAutoUrgent, type SignalRow } from '@/lib/urgency';
import { formatSignalDate } from '@/lib/format';

// Deliberately high — a short, accidental swipe should never complete something.
const QUICK_DONE_THRESHOLD = 120;
const MAX_DRAG_RIGHT = 160;
const EXIT_DISTANCE = 480;
const EXIT_MS = 260;

type Props = {
  signal: SignalRow;
  onToggleSignal: (id: string, next: boolean) => void;
  onMarkDone: (id: string) => void;
  onEdit: (signal: SignalRow) => void;
  onDelete: (id: string) => void;
  style?: React.CSSProperties;
};

export default function SignalCard({ signal, onToggleSignal, onMarkDone, onEdit, onDelete, style }: Props) {
  const dateLabel = formatSignalDate(signal);
  const urgent = isAutoUrgent(signal);
  const inSignal = Boolean(signal.is_today_signal);

  // The actions row (Done/Edit/Delete) is a plain inline toggle, entirely
  // independent of swipe/drag state — the More button never moves, so
  // pressing it again always closes what it just opened.
  const [menuOpen, setMenuOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const [offset, setOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [exiting, setExiting] = useState(false);
  const drag = useRef<{ startX: number; moved: boolean } | null>(null);

  // True once a right-swipe has been dragged far enough that releasing now
  // will complete it — drives the "point of no return" visual feedback.
  const pastQuickDone = dragging && offset >= QUICK_DONE_THRESHOLD;

  // Lets the swipe/tap finish its motion (slide fully off + fade) before the
  // item actually leaves the list, instead of yanking it out mid-animation.
  function exitThen(direction: 'right' | 'left', action: () => void) {
    setDragging(false);
    setExiting(true);
    setOffset(direction === 'right' ? EXIT_DISTANCE : -EXIT_DISTANCE);
    setTimeout(action, EXIT_MS);
  }

  function handlePointerDown(e: React.PointerEvent) {
    if (exiting) return;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { startX: e.clientX, moved: false };
    setDragging(true);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const delta = e.clientX - drag.current.startX;
    if (Math.abs(delta) > 4) drag.current.moved = true;
    setOffset(Math.min(MAX_DRAG_RIGHT, Math.max(0, delta)));
  }

  function handlePointerUp() {
    if (!drag.current) return;
    const { moved } = drag.current;
    drag.current = null;
    setDragging(false);

    if (!moved) {
      if (menuOpen) setMenuOpen(false);
      return;
    }

    if (offset >= QUICK_DONE_THRESHOLD) {
      exitThen('right', () => onMarkDone(signal.id));
    } else {
      setOffset(0);
    }
  }

  return (
    <div
      className="signal-rise relative overflow-hidden rounded-xl"
      style={{ ...style, opacity: exiting ? 0 : 1, transition: 'opacity 220ms ease' }}
    >
      <div
        className="absolute inset-y-0 left-0 flex items-center pl-4 transition-colors"
        style={{ background: pastQuickDone ? 'var(--signal)' : 'var(--signal-soft)' }}
      >
        <Check
          size={20}
          strokeWidth={2.5}
          className="transition-transform"
          style={{ color: pastQuickDone ? 'white' : 'var(--signal)', transform: pastQuickDone ? 'scale(1.3)' : 'scale(1)' }}
        />
      </div>

      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          transform: `translateX(${offset}px)`,
          transition: dragging ? 'none' : `transform ${exiting ? EXIT_MS : 220}ms cubic-bezier(0.16, 1, 0.3, 1)`,
          touchAction: 'pan-y',
          userSelect: dragging ? 'none' : undefined,
          borderColor: 'var(--border)',
          background: 'var(--surface)',
        }}
        className="relative border p-3 select-none"
      >
        <div className="flex items-start gap-3">
          <button
            aria-label={inSignal ? 'In today’s Signal — tap to remove' : 'Add to today’s Signal'}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSignal(signal.id, !inSignal);
            }}
            onPointerDown={(e) => e.stopPropagation()}
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
                  onClick={(e) => {
                    e.stopPropagation();
                    setDetailsOpen((v) => !v);
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
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
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen((v) => !v);
            }}
            onPointerDown={(e) => e.stopPropagation()}
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
