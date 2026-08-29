import webPush from "web-push";
import { prisma } from "@/lib/db/prisma";

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidSubject = process.env.VAPID_SUBJECT || "mailto:admin@trak-dlu.onrender.com";

let isConfigured = false;
if (vapidPublicKey && vapidPrivateKey) {
  webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  isConfigured = true;
} else {
  console.warn("VAPID keys not configured. Push notifications will not be sent.");
}

export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  data?: any,
  tag?: string
) {
  if (!isConfigured) return;

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  if (!subscriptions.length) return;

  const payload = JSON.stringify({
    title,
    body,
    data,
    tag,
  });

  const staleEndpoints: string[] = [];

  const sendPromises = subscriptions.map(async (sub) => {
    try {
      await webPush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload
      );
    } catch (err: any) {
      if (err.statusCode === 404 || err.statusCode === 410) {
        staleEndpoints.push(sub.endpoint);
      } else {
        console.error("Failed to send push notification:");
        console.error("Status:", err.statusCode);
        console.error("Headers:", err.headers);
        console.error("Body:", err.body);
        console.error("Error details:", err);
      }
    }
  });

  await Promise.all(sendPromises);

  if (staleEndpoints.length > 0) {
    await prisma.pushSubscription.deleteMany({
      where: { endpoint: { in: staleEndpoints } },
    });
  }
}
