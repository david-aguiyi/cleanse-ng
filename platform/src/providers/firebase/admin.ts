/**
 * Firebase Admin initialization (server-only). The service-account private key
 * never reaches the browser; the server sends push via the Admin SDK
 * (Blueprint §9.2, §14 Secrets).
 */
import "server-only";
import { getApps, initializeApp, cert, type App } from "firebase-admin/app";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

let cached: App | null = null;

export function firebaseAdminConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
  );
}

function adminApp(): App {
  if (cached) return cached;
  const existing = getApps();
  if (existing.length) {
    cached = existing[0]!;
    return cached;
  }
  cached = initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Env stores the key with escaped newlines; restore real newlines.
      privateKey: (process.env.FIREBASE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
    }),
  });
  return cached;
}

export function adminMessaging(): Messaging {
  return getMessaging(adminApp());
}
