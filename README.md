# Signal

Personal capture tool — quick task/thought entry that auto-escalates urgency over time. Runs entirely local: private GitHub repo, no public deployment, SQLite on disk, uploads on disk.

## Local setup

```bash
npm install
cp .env.local.example .env.local
```

Fill in `.env.local`:
- `SIGNAL_PASSCODE` — whatever passcode unlocks `/login`
- `AUTH_SECRET` — generate with `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

Leave `TURSO_DATABASE_URL` / `BLOB_READ_WRITE_TOKEN` unset — without them the app uses a local SQLite file (`data/signal.db`) and writes uploads to `public/uploads`, which is all local-only needs.

```bash
npm run dev
```

Open `http://localhost:3000` on the Mac to confirm it's running.

## Installing it on your phone (same Wi-Fi, local only)

The dev server already binds to `0.0.0.0`, so any device on the same network can reach it — nothing public involved.

1. Find the Mac's LAN IP:
   ```bash
   ipconfig getifaddr en0
   ```
2. On your iPhone (same Wi-Fi), open Safari and go to `http://<that-ip>:3000`.
3. Tap the Share icon → **Add to Home Screen**. It installs using the existing `manifest.json` / icons — full-screen, no browser chrome, looks like a real app.

This covers viewing and adding signals from your phone. One caveat: iOS only allows a Service Worker to register over HTTPS or `localhost` — over plain `http://<lan-ip>` the install icon works, but push notifications (`sw.js`) won't fire. If you want push working locally too:

```bash
npm run dev -- --experimental-https
```

then visit `https://<mac-ip>:3000` from the phone and accept the self-signed certificate prompt (Safari will warn once — proceed anyway). Re-add to home screen from the `https://` URL so the installed icon points at the secure origin.

## Keeping it running

`npm run dev` needs the terminal window (or an SSH session) to stay alive. For a longer-lived local session without babysitting a terminal:

```bash
npm run build
nohup npm run start > signal.log 2>&1 &
```

`next start` also binds `0.0.0.0` by default, so the same phone-install steps apply — minus `--experimental-https`, which is dev-only (drop the push-notification path if you go this route, or reintroduce HTTPS with `--experimental-https-key` / `--experimental-https-cert` pointed at your own cert).

## What no longer works now that it's local-only

The three scheduled jobs in `vercel.json` (`daily-reminder`, `weekly-recap`, `streak-risk`) were fired by Vercel Cron against the public deployment — with no deployment, they don't run. If you want them back, the endpoints are still live locally at `/api/cron/*`; the simplest fix is a `crontab -e` entry that `curl`s them on the same schedule while the local server is up, e.g.:

```
0 12 * * *   curl -s http://localhost:3000/api/cron/daily-reminder
0 0 * * 1    curl -s http://localhost:3000/api/cron/weekly-recap
30 0 * * *   curl -s http://localhost:3000/api/cron/streak-risk
```

## Stack

Next.js 16 (App Router, `proxy.ts` for middleware), React 19, Tailwind 4, libSQL/SQLite, `web-push` for notifications.
