import type { FavoritePayload, InteractionPayload } from "@/types/quote";

export async function postInteraction(payload: InteractionPayload): Promise<void> {
  await fetch("/api/interactions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => undefined);
}

export async function postFavorite(payload: FavoritePayload): Promise<void> {
  await fetch("/api/favorites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch(() => undefined);
}

export async function fetchFavorites(sessionId: string): Promise<string[]> {
  const response = await fetch(`/api/favorites?sessionId=${encodeURIComponent(sessionId)}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Nao foi possivel recuperar favoritas");
  }

  const payload = (await response.json()) as { favorites?: string[] };
  return Array.isArray(payload.favorites) ? payload.favorites : [];
}
