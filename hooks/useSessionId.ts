"use client";

import { signInAnonymously } from "firebase/auth";
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

    if (auth.currentUser) {
      const uid = auth.currentUser.uid;
      window.localStorage.setItem(SESSION_STORAGE_KEY, uid);
      setSessionId(uid);
      return;
    }

    let cancelled = false;

    void signInAnonymously(auth)
      .then((credentials) => {
        if (cancelled) {
          return;
        }

        const uid = credentials.user.uid;
        window.localStorage.setItem(SESSION_STORAGE_KEY, uid);
        setSessionId(uid);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  return sessionId;
}
