import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy — Signal',
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-lg flex-col px-4 pb-16 pt-8">
      <header className="mb-6 flex items-center gap-3">
        <Link href="/" aria-label="Back" className="flex h-10 w-10 items-center justify-center rounded-full" style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={20} strokeWidth={2.25} />
        </Link>
        <h1 className="text-xl font-semibold tracking-tight">Privacy Policy</h1>
      </header>

      <section className="flex flex-col gap-5 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        <p>
          Signal is a personal capture tool built and used by a single person (its developer). It is not a public product — access is
          gated by a private passcode, and it is not intended to be signed up for or used by the general public.
        </p>

        <div>
          <h2 className="mb-1 text-base font-semibold" style={{ color: 'var(--text)' }}>What data this app stores</h2>
          <p>
            Signal entries you create (task text, dates, status, and any attachments) are stored in a private database. This data is
            used only to run the app itself and is never sold, shared, or used for advertising.
          </p>
        </div>

        <div>
          <h2 className="mb-1 text-base font-semibold" style={{ color: 'var(--text)' }}>Google Calendar access</h2>
          <p>
            If Google Calendar is connected, Signal requests the <code>calendar.events</code> scope for one purpose only: to create,
            update, and delete events on the primary calendar that correspond to signals with a specific time. Signal never reads any
            other calendar data, never reads events it did not create, and this sync only ever flows one way — from Signal to Google
            Calendar, never the reverse.
          </p>
          <p className="mt-2">
            Google account data obtained through this integration is used solely to provide this one-way sync feature within Signal
            itself. It is not transferred to any third party and is not used for any other purpose.
          </p>
        </div>

        <div>
          <h2 className="mb-1 text-base font-semibold" style={{ color: 'var(--text)' }}>Contact</h2>
          <p>Questions about this policy or your data: nicmoffett5@gmail.com</p>
        </div>
      </section>
    </div>
  );
}
