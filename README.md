# Signal

Personal capture tool — quick task/thought entry that auto-escalates urgency over time. Deployed on Vercel, gated by a passcode (`SIGNAL_PASSCODE`) rather than being a genuinely private deployment — GitHub repo is public, data lives in Turso (libSQL) and Vercel Blob.

**Live URL:** https://signal-woad-one.vercel.app

## Installing it on your phone

Visit the live URL above in Safari (works over cellular or Wi-Fi — no LAN/same-network requirement), log in with the passcode, then Share icon → **Add to Home Screen**. Full-screen, no browser chrome, push notifications work immediately since the URL is real HTTPS.

## Local development

```bash
npm install
cp .env.local.example .env.local
```

Fill in `.env.local` — `SIGNAL_PASSCODE`, `AUTH_SECRET` (generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`), and `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` if you want local dev to read the real production data (`turso db show signal` / `turso db tokens create signal`). Leave those two unset to fall back to a local SQLite file (`data/signal.db`) instead.

```bash
npm run dev
```

## Deploying

```bash
vercel --prod
```

Project is linked (`nicholas-projects12/signal`). **Note:** GitHub auto-deploy-on-push isn't connected right now (the Vercel↔GitHub App connection failed during the 2026-08-25 redeploy) — pushes to `main` do NOT automatically deploy. Either run `vercel --prod` manually after pushing, or reconnect the GitHub integration from the Vercel dashboard (Project Settings → Git).

Cron jobs (`daily-reminder`, `weekly-recap`, `streak-risk` in `vercel.json`) run automatically via Vercel Cron against the live deployment — no manual crontab needed.

**Known gap:** a Vercel Blob store (`signal`, `store_1vpgS8dLjBblI4we`) exists but isn't connected to this project, so `BLOB_READ_WRITE_TOKEN` isn't set — attachment uploads will fail until it's connected via the Vercel dashboard (Project Settings → Storage → Connect Store). No real signal currently has an attachment, so this isn't urgent.

**Worth testing:** Google Calendar sync, since the OAuth redirect URI registered in Google Cloud Console may still point at an old deployment URL. If `/settings` calendar connection fails, that's the first thing to check.

## Stack

Next.js 16 (App Router, `proxy.ts` for middleware), React 19, Tailwind 4, libSQL/SQLite (Turso), Vercel Blob, `web-push` for notifications.
