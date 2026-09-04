import { getSessionIdToken } from "@/lib/firebase/client";
import type { FavoritePayload, InteractionPayload } from "@/types/quote";

/**
 * As rotas exigem o ID token do Firebase quando ele esta configurado: o dono das
 * favoritas passou a ser o `uid` do token, nunca o id que o cliente manda.
 */
async function authHeaders(): Promise<HeadersInit> {
  const token = await getSessionIdToken();
  return token
    ? { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    : { "Content-Type": "application/json" };
}

const INTERACTION_BATCH_SIZE = 12;
const INTERACTION_FLUSH_MS = 2500;

let interactionQueue: InteractionPayload[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let listenersAttached = false;
let isFlushing = false;

async function flushInteractionQueue(): Promise<void> {
  if (isFlushing || interactionQueue.length === 0) {
    return;
  }

  isFlushing = true;

  try {
    while (interactionQueue.length > 0) {
      const payload = interactionQueue.slice(0, INTERACTION_BATCH_SIZE);
      interactionQueue = interactionQueue.slice(payload.length);

      const success = await fetch("/api/interactions", {
        method: "POST",
        headers: await authHeaders(),
        keepalive: true,
        body: JSON.stringify(payload),
      })
        .then((response) => response.ok)
        .catch(() => false);

      if (!success) {
        interactionQueue = [...payload, ...interactionQueue].slice(-120);
        break;
      }
    }
  } finally {
    isFlushing = false;
  }
}

function scheduleInteractionFlush() {
  if (flushTimer) {
    return;
  }

  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushInteractionQueue();
  }, INTERACTION_FLUSH_MS);
}

function attachLifecycleFlushListeners() {
  if (listenersAttached || typeof window === "undefined") {
    return;
  }

  listenersAttached = true;
  const flushNow = () => {
    if (flushTimer) {
      clearTimeout(flushTimer);
      flushTimer = null;
    }
    void flushInteractionQueue();
  };

  window.addEventListener("pagehide", flushNow);
  window.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushNow();
    }
  });
}

export async function postInteraction(payload: InteractionPayload): Promise<void> {
  attachLifecycleFlushListeners();
  interactionQueue.push(payload);

  if (interactionQueue.length >= INTERACTION_BATCH_SIZE) {
    void flushInteractionQueue();
    return;
  }

  scheduleInteractionFlush();
}

export async function postFavorite(payload: FavoritePayload): Promise<void> {
  await fetch("/api/favorites", {
    method: "POST",
    headers: await authHeaders(),
    keepalive: true,
    body: JSON.stringify(payload),
  }).catch(() => undefined);
}

export async function fetchFavorites(sessionId: string): Promise<string[]> {
  const response = await fetch(`/api/favorites?sessionId=${encodeURIComponent(sessionId)}`, {
    cache: "no-store",
    headers: await authHeaders(),
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel recuperar favoritas");
  }

  const payload = (await response.json()) as { favorites?: string[] };
  return Array.isArray(payload.favorites) ? payload.favorites : [];
}
