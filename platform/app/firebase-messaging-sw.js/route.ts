import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Firebase messaging service worker, served at /firebase-messaging-sw.js so it
 * can carry the public Firebase web config injected from env (a static file in
 * public/ cannot read NEXT_PUBLIC_* at runtime). Handles background push and
 * routes a notification click to the offer deep link (Blueprint §9.2, §9.3).
 */
export async function GET() {
  // Read at TRUE runtime, not build time. Aliasing process.env defeats Next's
  // static inlining of `process.env.NEXT_PUBLIC_*` (which bakes in whatever the
  // value was AT BUILD, i.e. empty if the vars were added after the build). On
  // Vercel the serverless runtime has all Production env vars, so this always
  // reflects the current config regardless of when the build ran.
  const env = process.env;
  const cfg = {
    apiKey: env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain: env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId: env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    messagingSenderId: env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId: env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
  };

  // TEMP DIAGNOSTIC: which Firebase-related env keys does the runtime actually
  // see? Names only (NEXT_PUBLIC values are non-secret; server keys reported as
  // presence booleans). Remove once push config is confirmed working.
  const firebaseKeys = Object.keys(env)
    .filter((k) => k.includes("FIREBASE"))
    .sort()
    .join(",");
  const serverPresence = `FIREBASE_PROJECT_ID=${Boolean(env.FIREBASE_PROJECT_ID)},FIREBASE_CLIENT_EMAIL=${Boolean(
    env.FIREBASE_CLIENT_EMAIL
  )},FIREBASE_PRIVATE_KEY=${Boolean(env.FIREBASE_PRIVATE_KEY)}`;

  const body = `
// build-marker: sw-runtime-v3 | configured=${Boolean(cfg.projectId)}
// diag-firebase-keys: [${firebaseKeys}]
// diag-server-presence: ${serverPresence}
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

firebase.initializeApp(${JSON.stringify(cfg)});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function (payload) {
  const data = payload.data || {};
  const title = (payload.notification && payload.notification.title) || "New Cleanse job available";
  const body = (payload.notification && payload.notification.body) || "";
  const link = data.deep_link || "/cleaner/home";
  self.registration.showNotification(title, {
    body: body,
    icon: "/icons/icon-192.svg",
    badge: "/icons/icon-192.svg",
    data: { link: link },
    tag: data.offer_id || "cleanse-job",
    requireInteraction: true,
  });
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  const link = (event.notification.data && event.notification.data.link) || "/cleaner/home";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (list) {
      for (const client of list) {
        if (client.url.includes(link) && "focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(link);
    })
  );
});
`.trim();

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Service-Worker-Allowed": "/",
      "Cache-Control": "no-store",
    },
  });
}
