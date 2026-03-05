import "server-only";

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function normalizePrivateKey(value: string): string {
  return value.replace(/\\n/g, "\n");
}

function getAdminApp() {
  const existing = getApps()[0];
  if (existing) {
    return existing;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey: normalizePrivateKey(privateKey),
    }),
  });
}

export function isFirebaseAdminConfigured(): boolean {
  return getAdminApp() !== null;
}

export function getFirebaseAdminDb() {
  const app = getAdminApp();
  if (!app) {
    return null;
  }

  return getFirestore(app);
}
