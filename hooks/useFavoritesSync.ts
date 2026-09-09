"use client";

import { useEffect } from "react";

import { fetchFavorites, postFavorite } from "@/lib/client/interactions-api";
import { loadFavorites, mergeFavoriteIds, saveFavorites } from "@/lib/utils/local-favorites";
import { useQuoteStore } from "@/store/useQuoteStore";

/**
 * Carrega favoritas locais no boot e sincroniza com a nuvem (merge local +
 * nuvem, reenviando ao servidor o que faltar lá). Efeito colateral puro sobre
 * o useQuoteStore, mesmo padrão de useEmotionalSession — não devolve nada.
 */
export function useFavoritesSync(sessionId: string): void {
  const setSessionId = useQuoteStore((state) => state.setSessionId);
  const setFavorites = useQuoteStore((state) => state.setFavorites);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    setSessionId(sessionId);
    setFavorites(loadFavorites(sessionId));
  }, [sessionId, setFavorites, setSessionId]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    let cancelled = false;
    const localFavorites = loadFavorites(sessionId);

    void fetchFavorites(sessionId)
      .then((cloudFavorites) => {
        if (cancelled) {
          return;
        }

        const mergedFavorites = mergeFavoriteIds(localFavorites, cloudFavorites);
        setFavorites(mergedFavorites);
        saveFavorites(sessionId, mergedFavorites);

        const missingInCloud = mergedFavorites.filter((quoteId) => !cloudFavorites.includes(quoteId));
        for (const quoteId of missingInCloud) {
          void postFavorite({ sessionId, quoteId, isFavorite: true });
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [sessionId, setFavorites]);
}
