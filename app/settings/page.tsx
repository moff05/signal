'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Calendar, Check, Bell, AlertTriangle } from 'lucide-react';

function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

export default function SettingsPage() {
  const [connected, setConnected] = useState<boolean | null>(null);
  const [pushEnabled, setPushEnabled] = useState<boolean | null>(null);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);

  useEffect(() => {
    let ignore = false;
    (async () => {
      const res = await fetch('/api/auth/google/status');
      const data = await res.json();
      if (!ignore) setConnected(data.connected);
    })();

    (async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        if (!ignore) setPushEnabled(false);
        return;
      }
      const registration = await navigator.serviceWorker.register('/sw.js');
      const subscription = await registration.pushManager.getSubscription();
      if (!ignore) setPushEnabled(Boolean(subscription));
    })();

    return () => {
      ignore = true;
    };
  }, []);

  async function enablePush() {
    setPushBusy(true);
    setPushError(null);
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Push notifications aren’t supported in this browser.');
      }
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Notification permission was denied.');

      const registration = await navigator.serviceWorker.ready;
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error('Push isn’t configured yet.');

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      });
      setPushEnabled(true);
    } catch (err) {
      setPushError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setPushBusy(false);
    }
  }

  async function disablePush() {
    setPushBusy(true);
    setPushError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch('/api/push/subscribe', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
        await subscription.unsubscribe();
      }
      setPushEnabled(false);
    } catch (err) {
      setPushError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setPushBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-4 pb-16 pt-8">
      <header className="mb-6 flex items-center gap-3">
        <Link href="/" aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-full" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={20} strokeWidth={2.25} />
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">Settings</h1>
      </header>

      <section className="rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--accent-soft)' }}>
            <Calendar size={18} strokeWidth={2.25} style={{ color: 'var(--accent)' }} />
          </div>
          <div className="flex-1">
            <p className="font-medium">Google Calendar</p>
            <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
              {connected === null ? 'Checking…' : connected ? 'Connected — specific-time signals push here automatically.' : 'Not connected — specific-time signals only show on your widget.'}
            </p>
          </div>
        </div>
        {connected === false && (
          <a
            href="/api/auth/google"
            className="mt-3 flex items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-transform active:scale-95"
            style={{ background: 'var(--accent-fill)' }}
          >
            Connect Google Calendar
          </a>
        )}
        {connected === true && (
          <div className="mt-3 flex items-center gap-1.5 rounded-lg py-2 text-sm font-medium" style={{ color: 'var(--signal)' }}>
            <Check size={15} strokeWidth={2.5} />
            Connected
          </div>
        )}
      </section>

      <section className="mt-4 rounded-xl border p-4" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--accent-soft)' }}>
            <Bell size={18} strokeWidth={2.25} style={{ color: 'var(--accent)' }} />
          </div>
          <div className="flex-1">
            <p className="font-medium">Daily reminder</p>
            <p className="mt-0.5 text-sm" style={{ color: 'var(--text-muted)' }}>
              {pushEnabled === null ? 'Checking…' : pushEnabled ? 'On — a push arrives around 8am if you haven’t set today’s Signal yet.' : 'Off — nothing will remind you to check in.'}
            </p>
          </div>
        </div>
        {pushError && (
          <p className="mt-3 flex items-center gap-1.5 text-sm" style={{ color: 'var(--urgent)' }}>
            <AlertTriangle size={13} strokeWidth={2.5} />
            {pushError}
          </p>
        )}
        {pushEnabled !== null && (
          <button
            onClick={pushEnabled ? disablePush : enablePush}
            disabled={pushBusy}
            className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg px-4 py-2.5 text-sm font-medium transition-transform active:scale-95 disabled:opacity-50"
            style={
              pushEnabled
                ? { borderColor: 'var(--border)', border: '1px solid var(--border)', color: 'var(--text-muted)' }
                : { background: 'var(--accent-fill)', color: 'white' }
            }
          >
            {pushBusy ? 'Working…' : pushEnabled ? 'Turn off' : 'Enable daily reminder'}
          </button>
        )}
      </section>
    </div>
  );
}
