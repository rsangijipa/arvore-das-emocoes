import "server-only";

import { QUOTES } from "@/data/quotes";
import { THEMES } from "@/data/themes";
import { getFirebaseAdminDb, isFirebaseAdminConfigured } from "@/lib/firebase/admin";
import type {
  FavoritePayload,
  InteractionPayload,
  Quote,
  Tone,
  ThemeFilter,
  ThemeOption,
  ThemeSlug,
} from "@/types/quote";
import { TONES } from "@/types/quote";

/**
 * Estado em memoria: fallback de MODO LOCAL, usado apenas quando o Firebase
 * Admin nao esta configurado. Em runtime serverless cada instancia tem a sua
 * copia e tudo se perde no cold start — por isso nao serve como armazenamento
 * real, so mantem a aplicacao navegavel em desenvolvimento.
 */
const interactionLog = new Map<string, InteractionPayload[]>();
const favoritesBySession = new Map<string, Set<string>>();
const MAX_IN_MEMORY_SESSIONS = 400;

/**
 * O catalogo de frases muda raramente e e igual para todo mundo, entao vale
 * cachear por instancia. Favoritas NAO sao cacheadas: sao por usuario e mudam a
 * cada clique, e um cache por instancia devolvia lista velha por ate 30s quando
 * o POST caia em outra instancia.
 */
const QUOTE_CACHE_TTL_MS = 60_000;

/** teto de operacoes por batch do Firestore */
const FIRESTORE_BATCH_LIMIT = 500;

let firestoreQuotesCache: {
  expiresAt: number;
  quotes: Quote[];
} | null = null;

function trimSessionMap<T>(map: Map<string, T>, maxEntries: number) {
  while (map.size > maxEntries) {
    const firstKey = map.keys().next().value;
    if (!firstKey) {
      break;
    }
    map.delete(firstKey);
  }
}

function activeQuotes(): Quote[] {
  return QUOTES.filter((quote) => quote.active);
}

function byTheme(theme: ThemeFilter): Quote[] {
  if (theme === "all") {
    return activeQuotes();
  }

  return activeQuotes().filter((quote) => quote.theme === theme);
}

function toThemeSlug(value: unknown): ThemeSlug | null {
  if (typeof value !== "string") {
    return null;
  }

  return THEMES.some((theme) => theme.slug === value) ? (value as ThemeSlug) : null;
}

function toTone(value: unknown): Tone | null {
  if (typeof value !== "string") {
    return null;
  }

  return TONES.includes(value as Tone) ? (value as Tone) : null;
}

function firestoreQuoteToDomain(docId: string, data: Record<string, unknown>): Quote | null {
  const theme = toThemeSlug(data.theme);
  const tone = toTone(data.tone);

  if (!theme || !tone || typeof data.text !== "string") {
    return null;
  }

  return {
    id: typeof data.id === "string" ? data.id : docId,
    text: data.text,
    theme,
    tone,
    author: typeof data.author === "string" ? data.author : undefined,
    active: typeof data.active === "boolean" ? data.active : true,
    createdAt: typeof data.createdAt === "string" ? data.createdAt : new Date().toISOString(),
    updatedAt: typeof data.updatedAt === "string" ? data.updatedAt : new Date().toISOString(),
  };
}

function randomFromList(quotes: Quote[], excludeId?: string): Quote | null {
  const eligible = excludeId ? quotes.filter((quote) => quote.id !== excludeId) : quotes;
  if (eligible.length === 0) {
    return null;
  }

  const index = Math.floor(Math.random() * eligible.length);
  return eligible[index] ?? null;
}

export async function listThemes(): Promise<ThemeOption[]> {
  return THEMES;
}

export async function listQuotes(theme: ThemeFilter): Promise<Quote[]> {
  const db = getFirebaseAdminDb();

  if (db) {
    try {
      const now = Date.now();
      const cached = firestoreQuotesCache;
      let firestoreQuotes: Quote[];

      if (cached && cached.expiresAt > now) {
        firestoreQuotes = cached.quotes;
      } else {
        const snapshot = await db.collection("quotes").where("active", "==", true).get();
        firestoreQuotes = snapshot.docs
          .map((doc) => firestoreQuoteToDomain(doc.id, doc.data() as Record<string, unknown>))
          .filter((quote): quote is Quote => Boolean(quote));

        firestoreQuotesCache = {
          expiresAt: now + QUOTE_CACHE_TTL_MS,
          quotes: firestoreQuotes,
        };
      }

      if (firestoreQuotes.length > 0) {
        if (theme === "all") {
          return firestoreQuotes;
        }

        return firestoreQuotes.filter((quote) => quote.theme === theme);
      }
    } catch {
      return byTheme(theme);
    }
  }

  return byTheme(theme);
}

export async function randomQuote(theme: ThemeFilter, excludeId?: string): Promise<Quote | null> {
  const quotes = await listQuotes(theme);
  return randomFromList(quotes, excludeId);
}

export async function registerInteraction(payload: InteractionPayload): Promise<void> {
  return registerInteractions([payload]);
}

export async function registerInteractions(payloads: InteractionPayload[]): Promise<void> {
  if (payloads.length === 0) {
    return;
  }

  const db = getFirebaseAdminDb();

  if (db) {
    try {
      // O batch do Firestore rejeita mais de 500 operacoes: recortamos em
      // blocos para que um lote grande nao derrube a rota inteira.
      for (let start = 0; start < payloads.length; start += FIRESTORE_BATCH_LIMIT) {
        const chunk = payloads.slice(start, start + FIRESTORE_BATCH_LIMIT);
        const batch = db.batch();

        for (const payload of chunk) {
          const ref = db.collection("user_interactions").doc();
          batch.set(ref, {
            sessionId: payload.sessionId,
            actionType: payload.actionType,
            quoteId: payload.quoteId ?? null,
            theme: payload.theme ?? "all",
            createdAt: new Date().toISOString(),
          });
        }

        await batch.commit();
      }

      return;
    } catch {
      // Fallback em memoria para manter a aplicacao funcional sem Firebase.
    }
  }

  for (const payload of payloads) {
    const existing = interactionLog.get(payload.sessionId) ?? [];
    const next = [...existing, payload];
    const bounded = next.length > 200 ? next.slice(next.length - 200) : next;
    interactionLog.set(payload.sessionId, bounded);
  }

  trimSessionMap(interactionLog, MAX_IN_MEMORY_SESSIONS);
}

/**
 * Sem cache de proposito: favoritas sao por usuario e mudam a cada clique. Um
 * cache por instancia devolvia lista desatualizada por ate 30s sempre que o
 * POST era atendido por outra instancia (salvar no celular, abrir no desktop).
 */
export async function listFavorites(sessionId: string): Promise<string[]> {
  const db = getFirebaseAdminDb();

  if (db) {
    try {
      const snapshot = await db.collection("user_favorites").doc(sessionId).get();
      const quoteIds = snapshot.data()?.quoteIds;
      return Array.isArray(quoteIds) ? quoteIds.filter((id): id is string => typeof id === "string") : [];
    } catch {
      // Fallback local caso o Firestore nao esteja disponivel.
    }
  }

  trimSessionMap(favoritesBySession, MAX_IN_MEMORY_SESSIONS);
  return [...(favoritesBySession.get(sessionId) ?? new Set<string>())];
}

export async function saveFavorite(payload: FavoritePayload): Promise<string[]> {
  const db = getFirebaseAdminDb();

  if (db) {
    const ref = db.collection("user_favorites").doc(payload.sessionId);

    try {
      const snapshot = await ref.get();
      const existing = snapshot.data()?.quoteIds;
      const current = Array.isArray(existing) ? existing.filter((id): id is string => typeof id === "string") : [];

      const next = payload.isFavorite
        ? Array.from(new Set([...current, payload.quoteId]))
        : current.filter((id) => id !== payload.quoteId);

      await ref.set(
        {
          quoteIds: next,
          updatedAt: new Date().toISOString(),
        },
        { merge: true },
      );

      return next;
    } catch {
      // Fallback local caso o Firestore nao esteja disponivel.
    }
  }

  const sessionFavorites = favoritesBySession.get(payload.sessionId) ?? new Set<string>();

  if (payload.isFavorite) {
    sessionFavorites.add(payload.quoteId);
  } else {
    sessionFavorites.delete(payload.quoteId);
  }

  favoritesBySession.set(payload.sessionId, sessionFavorites);
  trimSessionMap(favoritesBySession, MAX_IN_MEMORY_SESSIONS);
  return [...sessionFavorites.values()];
}

export async function hasTheme(theme: string): Promise<boolean> {
  if (theme === "all") {
    return true;
  }

  return THEMES.some((item) => item.slug === (theme as ThemeSlug));
}

export async function isCloudRepositoryEnabled(): Promise<boolean> {
  return isFirebaseAdminConfigured();
}
