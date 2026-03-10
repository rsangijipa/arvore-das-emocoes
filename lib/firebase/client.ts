"use client";

import type { Auth } from "firebase/auth";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

function hasFirebaseClientConfig(): boolean {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.authDomain &&
      firebaseConfig.projectId &&
      firebaseConfig.appId,
  );
}

let authPromise: Promise<Auth | null> | null = null;

export async function getFirebaseClientAuth(): Promise<Auth | null> {
  if (!hasFirebaseClientConfig()) {
    return null;
  }

  if (authPromise) {
    return authPromise;
  }

  authPromise = (async () => {
    const [{ getApps, initializeApp }, { browserLocalPersistence, getAuth, setPersistence }] = await Promise.all([
      import("firebase/app"),
      import("firebase/auth"),
    ]);

    const app = getApps()[0] ?? initializeApp(firebaseConfig);
    const auth = getAuth(app);
    await setPersistence(auth, browserLocalPersistence).catch(() => undefined);
    return auth;
  })();

  return authPromise;
}

export async function bindAnonymousSession(onSessionId: (sessionId: string) => void): Promise<(() => void) | null> {
  const auth = await getFirebaseClientAuth();
  if (!auth) {
    return null;
  }

  const { onAuthStateChanged, signInAnonymously } = await import("firebase/auth");
  return onAuthStateChanged(auth, (user) => {
    if (user) {
      onSessionId(user.uid);
      return;
    }

    void signInAnonymously(auth).catch(() => undefined);
  });
}
