import webpush from 'web-push';
import { getDb } from '@/lib/db';

function configure() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) throw new Error('VAPID keys not set');
  webpush.setVapidDetails('mailto:nicmoffett5@gmail.com', publicKey, privateKey);
}

// Sends to every stored subscription. A subscription that 404s/410s has been
// revoked by the browser (e.g. app reinstalled) — cleaned up automatically
// so dead endpoints don't pile up.
export async function sendPushToAll(payload: { title: string; body: string }) {
  configure();
  const db = getDb();
  const result = await db.execute('SELECT endpoint, p256dh, auth FROM push_subscriptions');

  await Promise.all(
    result.rows.map(async (row) => {
      const subscription = {
        endpoint: row.endpoint as string,
        keys: { p256dh: row.p256dh as string, auth: row.auth as string },
      };
      try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number })?.statusCode;
        if (statusCode === 404 || statusCode === 410) {
          await db.execute({ sql: 'DELETE FROM push_subscriptions WHERE endpoint = ?', args: [row.endpoint] });
        } else {
          console.error('Push send failed:', err);
        }
      }
    })
  );
}
