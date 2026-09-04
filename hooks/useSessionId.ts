"use client";

import { useEffect, useState } from "react";

import { bindAnonymousSession } from "@/lib/firebase/client";
import { migrateFavoritesBucket } from "@/lib/utils/local-favorites";
import { migrateLegacyStorage, SESSION_STORAGE_KEY } from "@/lib/utils/storage";

function getOrCreateSessionId(): string {
  if (typeof window === "undefined") {
    return "";
  }

  migrateLegacyStorage();

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
    let unsubscribe: (() => void) | null = null;
    let cancelled = false;

    void bindAnonymousSession((uid) => {
      if (cancelled) {
        return;
      }

      const previousSessionId = window.localStorage.getItem(SESSION_STORAGE_KEY);
      if (previousSessionId && previousSessionId !== uid) {
        migrateFavoritesBucket(previousSessionId, uid);
      }

      window.localStorage.setItem(SESSION_STORAGE_KEY, uid);
      setSessionId(uid);
    }).then((nextUnsubscribe) => {
      if (cancelled) {
        nextUnsubscribe?.();
        return;
      }

      unsubscribe = nextUnsubscribe;
    });

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  return sessionId;
}
