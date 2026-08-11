'use client';

import { useRef, useState } from 'react';
import { Check, Inbox, CalendarClock, CalendarCheck, Paperclip, Sparkles, Repeat, Clock, X } from 'lucide-react';
import type { SignalRow, RepeatInterval } from '@/lib/urgency';

type DateMode = 'none' | 'deadline' | 'fixed_time';

// Mirrors the server threshold in app/api/signals/route.ts — just for the hint.
const SUMMARIZE_HINT_THRESHOLD = 100;

type Props = {
  initial?: SignalRow | null;
  onClose: () => void;
  onSaved: () => void;
};

const DATE_MODES: { mode: DateMode; label: string; icon: typeof Inbox; helper: string }[] = [
  { mode: 'none', label: 'Someday', icon: Inbox, helper: 'No date — sits in your backlog until you’re ready.' },
  { mode: 'deadline', label: 'Deadline', icon: CalendarClock, helper: 'Automatically turns urgent as the date gets close. No time set means end of day.' },
  { mode: 'fixed_time', label: 'Specific time', icon: CalendarCheck, helper: 'Fixed time — connect Google Calendar in Settings to also push it there.' },
];

function toLocalInputValue(iso: string | null): string {
  if (!iso) return '';
  const date = new Date(iso);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

export default function SignalSheet({ initial, onClose, onSaved }: Props) {
  const isEdit = Boolean(initial);
  const [text, setText] = useState(initial?.text ?? '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleTextChange(value: string) {
    setText(value);
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 320)}px`;
    }
  }
  const [dateMode, setDateMode] = useState<DateMode>(initial?.type === 'fixed_time' ? 'fixed_time' : initial?.type === 'deadline' ? 'deadline' : 'none');
  const [dueDate, setDueDate] = useState(initial?.due_date?.slice(0, 10) ?? '');
  // due_date is "YYYY-MM-DD" with no time chosen, or "YYYY-MM-DDTHH:MM" when
  // it was — pull the time portion back out for editing.
  const [dueTime, setDueTime] = useState((initial?.due_date?.length ?? 0) > 10 ? initial!.due_date!.slice(11, 16) : '');
  const [eventDatetime, setEventDatetime] = useState(toLocalInputValue(initial?.event_datetime ?? null));
  const [repeat, setRepeat] = useState<RepeatInterval>(initial?.repeat ?? 'none');
  const [file, setFile] = useState<File | null>(null);
  const [removeAttachment, setRemoveAttachment] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setSaving(true);
    setError(null);

    const combinedDueDate = dueTime ? `${dueDate}T${dueTime}` : dueDate;

    try {
      if (isEdit && initial) {
        const form = new FormData();
        form.set('text', text);
        form.set('event_datetime', dateMode === 'fixed_time' && eventDatetime ? new Date(eventDatetime).toISOString() : '');
        form.set('due_date', dateMode === 'deadline' && dueDate ? combinedDueDate : '');
        form.set('repeat', dateMode === 'none' ? 'none' : repeat);
        if (file) form.set('attachment', file);
        else if (removeAttachment) form.set('remove_attachment', 'true');

        const res = await fetch(`/api/signals/${initial.id}`, { method: 'PATCH', body: form });
        if (!res.ok) throw new Error('Save failed');
      } else {
        const form = new FormData();
        form.set('text', text);
        if (dateMode === 'fixed_time' && eventDatetime) form.set('event_datetime', new Date(eventDatetime).toISOString());
        if (dateMode === 'deadline' && dueDate) form.set('due_date', combinedDueDate);
        if (dateMode !== 'none') form.set('repeat', repeat);
        if (file) form.set('attachment', file);

        const res = await fetch('/api/signals', { method: 'POST', body: form });
        if (!res.ok) throw new Error('Save failed');
      }
      onSaved();
    } catch {
      setError('Something went wrong — try again.');
    } finally {
      setSaving(false);
    }
  }

  const activeDateMode = DATE_MODES.find((d) => d.mode === dateMode)!;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit}
        className="signal-modal-in w-full max-w-md rounded-2xl border p-5 shadow-2xl"
        style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}
      >
        <h2 className="mb-4 text-lg font-semibold tracking-tight">{isEdit ? 'Edit signal' : 'New signal'}</h2>

        <div className="mb-1 rounded-xl border p-1" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
          <textarea
            ref={textareaRef}
            autoFocus
            required
            value={text}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder="What's on your mind?"
            rows={3}
            className="max-h-80 w-full resize-none overflow-y-auto rounded-lg p-2.5"
          />
          {isEdit && initial?.attachment_url && !removeAttachment && !file ? (
            <div className="flex items-center gap-2 px-2.5 pb-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={initial.attachment_url} alt="" loading="lazy" className="h-10 w-10 rounded-md border object-cover" style={{ borderColor: 'var(--border)' }} />
              <label className="flex flex-1 cursor-pointer items-center gap-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
                <Paperclip size={14} strokeWidth={2} />
                Replace photo
                <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="hidden" />
              </label>
              <button
                type="button"
                onClick={() => setRemoveAttachment(true)}
                aria-label="Remove photo"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                style={{ color: 'var(--urgent)' }}
              >
                <X size={14} strokeWidth={2.25} />
              </button>
            </div>
          ) : (
            <label className="flex cursor-pointer items-center gap-1.5 px-2.5 pb-2 text-sm" style={{ color: file ? 'var(--accent)' : 'var(--text-muted)' }}>
              <Paperclip size={14} strokeWidth={2} />
              {file ? file.name : 'Attach a photo'}
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setRemoveAttachment(false);
                }}
                className="hidden"
              />
            </label>
          )}
        </div>

        {!isEdit && text.length > SUMMARIZE_HINT_THRESHOLD && (
          <p className="mb-3 mt-1.5 flex items-center gap-1.5 text-xs" style={{ color: 'var(--accent)' }}>
            <Sparkles size={12} strokeWidth={2.25} />
            Long note — Signal will generate a short title and keep this as expandable details.
          </p>
        )}

        <p className="mb-1.5 mt-4 text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
          When
        </p>
        <div className="mb-2 grid grid-cols-3 gap-2">
          {DATE_MODES.map(({ mode, label, icon: Icon }) => (
            <button
              type="button"
              key={mode}
              onClick={() => setDateMode(mode)}
              className="flex flex-col items-center gap-1.5 rounded-xl border py-2.5 text-xs font-medium transition-[color,background-color,border-color] active:scale-95"
              style={{
                borderColor: dateMode === mode ? 'var(--accent)' : 'var(--border)',
                background: dateMode === mode ? 'var(--accent-soft)' : 'transparent',
                color: dateMode === mode ? 'var(--accent)' : 'var(--text-muted)',
              }}
            >
              <Icon size={18} strokeWidth={2} />
              {label}
            </button>
          ))}
        </div>
        <p className="mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          {activeDateMode.helper}
        </p>

        {dateMode === 'deadline' && (
          <>
            <div className="mb-1 flex items-center gap-2 rounded-lg border px-3" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
              <CalendarClock size={16} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                aria-label="Due date"
                className="w-full bg-transparent py-2.5"
              />
            </div>
            <div className="mb-1 flex items-center gap-2 rounded-lg border px-3" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
              <Clock size={16} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                aria-label="Due time (optional)"
                className="w-full bg-transparent py-2.5"
              />
              {dueTime && (
                <button
                  type="button"
                  onClick={() => setDueTime('')}
                  aria-label="Clear time"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
                  style={{ color: 'var(--text-muted)' }}
                >
                  <X size={14} strokeWidth={2.25} />
                </button>
              )}
            </div>
          </>
        )}

        {dateMode === 'fixed_time' && (
          <div className="mb-1 flex items-center gap-2 rounded-lg border px-3" style={{ borderColor: 'var(--border)', background: 'var(--bg)' }}>
            <CalendarCheck size={16} strokeWidth={2} style={{ color: 'var(--text-muted)' }} />
            <input
              type="datetime-local"
              value={eventDatetime}
              onChange={(e) => setEventDatetime(e.target.value)}
              aria-label="Event date and time"
              className="w-full bg-transparent py-2.5"
            />
          </div>
        )}

        {dateMode !== 'none' && (
          <div className="mb-1 mt-3 flex items-center gap-2">
            <Repeat size={14} strokeWidth={2.25} style={{ color: 'var(--text-muted)' }} />
            <div className="flex flex-1 gap-1.5">
              {(['none', 'weekly', 'monthly'] as RepeatInterval[]).map((option) => (
                <button
                  type="button"
                  key={option}
                  onClick={() => setRepeat(option)}
                  className="flex-1 rounded-lg border py-2.5 text-xs font-medium transition-[color,background-color,border-color] active:scale-95"
                  style={{
                    borderColor: repeat === option ? 'var(--accent)' : 'var(--border)',
                    background: repeat === option ? 'var(--accent-soft)' : 'transparent',
                    color: repeat === option ? 'var(--accent)' : 'var(--text-muted)',
                  }}
                >
                  {option === 'none' ? 'Once' : option === 'weekly' ? 'Weekly' : 'Monthly'}
                </button>
              ))}
            </div>
          </div>
        )}

        <p className="mb-4 mt-4 text-xs" style={{ color: 'var(--text-muted)' }}>
          Adding this to today’s Signal happens from the list, once you’re ready to commit to it.
        </p>

        {error && (
          <p className="mb-3 text-sm" style={{ color: 'var(--urgent)' }}>
            {error}
          </p>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border py-3 font-medium transition-transform active:scale-95"
            style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !text.trim()}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg py-3 font-medium text-white transition-transform active:scale-95 disabled:opacity-50"
            style={{ background: 'var(--accent-fill)', boxShadow: '0 8px 24px -10px var(--accent-fill)' }}
          >
            {saving ? 'Saving…' : (
              <>
                <Check size={16} strokeWidth={2.5} />
                Save
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
