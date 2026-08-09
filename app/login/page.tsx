'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Radio } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode }),
    });

    if (res.ok) {
      router.push('/');
      router.refresh();
    } else {
      setError('Incorrect passcode');
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-xs">
        <div className="mb-8 flex flex-col items-center gap-2">
          <Radio size={28} strokeWidth={2} style={{ color: 'var(--accent)' }} />
          <h1 className="text-2xl font-semibold tracking-tight">Signal</h1>
        </div>
        <input
          autoFocus
          type="password"
          inputMode="numeric"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          placeholder="Passcode"
          aria-label="Passcode"
          className="mb-3 w-full rounded-lg border p-3 text-center"
          style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}
        />
        {error && (
          <p className="mb-3 text-center text-sm" style={{ color: 'var(--urgent)' }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting || !passcode}
          className="w-full rounded-lg py-3 font-medium text-white transition-transform active:scale-95 disabled:opacity-50"
          style={{ background: 'var(--accent-fill)', boxShadow: '0 8px 24px -10px var(--accent)' }}
        >
          {submitting ? 'Checking…' : 'Unlock'}
        </button>
      </form>
    </div>
  );
}
