import { FAVORITES_PREFIX } from "@/lib/utils/storage";

const STORAGE_PREFIX = FAVORITES_PREFIX;

function storageKey(sessionId: string): string {
  return `${STORAGE_PREFIX}.${sessionId}`;
}

export function loadFavorites(sessionId: string): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(storageKey(sessionId));
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveFavorites(sessionId: string, quoteIds: string[]): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(storageKey(sessionId), JSON.stringify(quoteIds));
  } catch {
    // cota cheia ou armazenamento bloqueado: a nuvem continua sendo a fonte
  }
}

export function mergeFavoriteIds(...groups: string[][]): string[] {
  return Array.from(
    new Set(
      groups.flatMap((group) => group.filter((quoteId): quoteId is string => typeof quoteId === "string" && quoteId.length > 0)),
    ),
  );
}

export function removeFavorites(sessionId: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(storageKey(sessionId));
}

export function migrateFavoritesBucket(fromSessionId: string, toSessionId: string): string[] {
  if (!fromSessionId || !toSessionId || fromSessionId === toSessionId) {
    return loadFavorites(toSessionId);
  }

  const merged = mergeFavoriteIds(loadFavorites(fromSessionId), loadFavorites(toSessionId));
  saveFavorites(toSessionId, merged);
  removeFavorites(fromSessionId);
  return merged;
}
