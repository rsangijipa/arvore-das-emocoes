"use client";

import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { useEffect, useState } from "react";

import { getFirebaseClientAuth } from "@/lib/firebase/client";

const SESSION_STORAGE_KEY = "harvore.sessionId";

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
  if (existing) {
    return existing;
  }

  const generated = crypto.randomUUID();
  window.localStorage.setItem(SESSION_STORAGE_KEY, generated);
  return generated;
}

export function useSessionId() {
  const [sessionId, setSessionId] = useState(() => getOrCreateSessionId());

  useEffect(() => {
    const auth = getFirebaseClientAuth();
    if (!auth) {
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        window.localStorage.setItem(SESSION_STORAGE_KEY, user.uid);
        setSessionId(user.uid);
        return;
      }

      void signInAnonymously(auth).catch(() => undefined);
    });

    return unsubscribe;
  }, []);

  return sessionId;
}
