"use client";

/**
 * Browser Firebase Cloud Messaging helper for the cleaner PWA (Blueprint §9.1).
 * Notification permission is requested only on an explicit user action, never
 * automatically on page load.
 */
import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getMessaging, getToken, isSupported, type Messaging } from "firebase/messaging";

const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function firebaseConfigured(): boolean {
  return Boolean(config.apiKey && config.projectId && config.messagingSenderId && config.appId);
}

function app(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(config);
}

async function messaging(): Promise<Messaging | null> {
  if (!firebaseConfigured()) return null;
  if (!(await isSupported())) return null;
  return getMessaging(app());
}

export function detectPlatform(): "ANDROID_WEB" | "IOS_WEB" | "DESKTOP_WEB" | "OTHER" {
  if (typeof navigator === "undefined") return "OTHER";
  const ua = navigator.userAgent;
  if (/Android/i.test(ua)) return "ANDROID_WEB";
  if (/iPhone|iPad|iPod/i.test(ua)) return "IOS_WEB";
  return "DESKTOP_WEB";
}

export interface EnablePushResult {
  ok: boolean;
  token?: string;
  permission: NotificationPermission | "unsupported";
  reason?: string;
}

/**
 * Register the SW, request notification permission (explicit tap), and obtain
 * an FCM token. Returns enough to POST to /api/v1/cleaner/devices.
 */
export async function enablePush(): Promise<EnablePushResult> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
    return { ok: false, permission: "unsupported", reason: "Service workers not available." };
  }
  if (!firebaseConfigured()) {
    return { ok: false, permission: "unsupported", reason: "Push is not configured yet." };
  }

  const m = await messaging();
  if (!m) {
    return { ok: false, permission: "unsupported", reason: "Push not supported on this device." };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, permission, reason: "Notification permission was not granted." };
  }

  const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

  try {
    const token = await getToken(m, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });
    if (!token) return { ok: false, permission, reason: "Could not obtain a device token." };
    return { ok: true, token, permission };
  } catch (err) {
    return {
      ok: false,
      permission,
      reason: err instanceof Error ? err.message : "Could not obtain a device token.",
    };
  }
}
