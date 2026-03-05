const STORAGE_PREFIX = "harvore.favorites";

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

  window.localStorage.setItem(storageKey(sessionId), JSON.stringify(quoteIds));
}
