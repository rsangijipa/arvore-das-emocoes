"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, Heart, RefreshCw, SlidersHorizontal } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { FavoritesDrawer } from "@/components/ui/FavoritesDrawer";
import { LeafMessageCard } from "@/components/ui/LeafMessageCard";
import { ThemeFilter } from "@/components/ui/ThemeFilter";
import { themeLabel } from "@/data/labels";
import { THEMES } from "@/data/themes";
import { usePerformanceMode } from "@/hooks/usePerformanceMode";
import { useReducedMotionPreference } from "@/hooks/useReducedMotionPreference";
import { useSessionId } from "@/hooks/useSessionId";
import { useSoundscape } from "@/hooks/useSoundscape";
import { fetchFavorites, postFavorite, postInteraction } from "@/lib/client/interactions-api";
import { fetchQuotesByTheme } from "@/lib/client/quote-api";
import { createTreeSeed, MESSAGE_LEAF_COUNT } from "@/lib/theme/scene-tokens";
import { loadFavorites, mergeFavoriteIds, saveFavorites } from "@/lib/utils/local-favorites";
import { INTRO_STORAGE_KEY, migrateLegacyStorage } from "@/lib/utils/storage";
import type { TreeSceneApi } from "@/components/3d/TreeScene";
import { useQuoteStore } from "@/store/useQuoteStore";
import type { QualityProfile } from "@/types/performance";
import type { Quote } from "@/types/quote";

const TreeScene = dynamic(() => import("@/components/3d/TreeScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-xs tracking-[0.2em] uppercase text-[#DCE8F5]">
      Carregando atmosfera...
    </div>
  ),
});

/** distribui as frases entre as folhas-mensagem de forma estável por semente */
function buildLeafQuoteMap(quotes: Quote[], seed: number, slots: number): (Quote | null)[] {
  if (quotes.length === 0) {
    return Array.from({ length: slots }, () => null);
  }

  let state = (seed | 0) || 1;
  const nextRandom = () => {
    state = (Math.imul(1664525, state) + 1013904223) | 0;
    return (state >>> 0) / 4294967296;
  };

  const order = quotes.map((_, index) => index);
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(nextRandom() * (index + 1));
    const current = order[index];
    order[index] = order[swap];
    order[swap] = current;
  }

  return Array.from({ length: slots }, (_, index) => quotes[order[index % order.length]] ?? null);
}

export function ExperienceRoot() {
  const sessionId = useSessionId();
  const { profile, setProfile } = usePerformanceMode();
  const reduceMotion = useReducedMotionPreference();

  const [isMobile, setIsMobile] = useState(false);
  const [loadingQuotes, setLoadingQuotes] = useState(true);
  const [sceneReady, setSceneReady] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  const [introLocked, setIntroLocked] = useState(true);
  const [showHint, setShowHint] = useState(true);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [favoriteFeedback, setFavoriteFeedback] = useState<string | null>(null);
  const [hudExpanded, setHudExpanded] = useState(false);

  // a árvore é sorteada a cada abertura (nunca durante o render do servidor)
  const [treeSeed, setTreeSeed] = useState<number | null>(null);
  const [pendingQuote, setPendingQuote] = useState<Quote | null>(null);

  /** API imperativa da cena 3D (entregue por onSceneApi) */
  const sceneApiRef = useRef<TreeSceneApi | null>(null);

  const favoriteFeedbackTimeout = useRef<number | null>(null);
  const hoverSoundCooldownRef = useRef(0);
  const hudAutoCollapseDoneRef = useRef(false);

  const { playFavorite, playHover, playRandom, playClick } = useSoundscape(true);

  const quotes = useQuoteStore((state) => state.quotes);
  const activeQuote = useQuoteStore((state) => state.activeQuote);
  const themeFilter = useQuoteStore((state) => state.themeFilter);
  const favorites = useQuoteStore((state) => state.favorites);
  const panelOpen = useQuoteStore((state) => state.panelOpen);
  const qualityProfile = useQuoteStore((state) => state.qualityProfile);
  const setSessionId = useQuoteStore((state) => state.setSessionId);
  const setQuotes = useQuoteStore((state) => state.setQuotes);
  const setActiveQuote = useQuoteStore((state) => state.setActiveQuote);
  const setThemeFilter = useQuoteStore((state) => state.setThemeFilter);
  const toggleFavorite = useQuoteStore((state) => state.toggleFavorite);
  const setFavorites = useQuoteStore((state) => state.setFavorites);
  const setPanelOpen = useQuoteStore((state) => state.setPanelOpen);
  const setQualityProfile = useQuoteStore((state) => state.setQualityProfile);

  // -------------------------------------------------------------- bootstrap
  useEffect(() => {
    migrateLegacyStorage();
    setTreeSeed(createTreeSeed());
    setShowIntro(window.localStorage.getItem(INTRO_STORAGE_KEY) !== "1");
  }, []);

  useEffect(() => {
    return () => {
      if (favoriteFeedbackTimeout.current) {
        window.clearTimeout(favoriteFeedbackTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    setQualityProfile(profile);
  }, [profile, setQualityProfile]);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 1023px)");
    const handleChange = () => setIsMobile(media.matches);
    handleChange();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, []);

  useEffect(() => {
    if (!sceneReady) {
      return;
    }

    const timeout = window.setTimeout(() => setIntroLocked(false), reduceMotion ? 400 : 2600);
    return () => window.clearTimeout(timeout);
  }, [reduceMotion, sceneReady]);

  useEffect(() => {
    if (introLocked || hudAutoCollapseDoneRef.current) {
      return;
    }

    setHudExpanded(true);
    const timeout = window.setTimeout(() => {
      setHudExpanded(false);
      hudAutoCollapseDoneRef.current = true;
    }, 3600);

    return () => window.clearTimeout(timeout);
  }, [introLocked]);

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

  const loadAllQuotes = useCallback(async () => {
    setLoadingQuotes(true);

    try {
      const payload = await fetchQuotesByTheme("all");
      setQuotes(payload.quotes);
    } catch {
      // a cena continua utilizável mesmo sem rede; o painel avisa o usuário
    } finally {
      setLoadingQuotes(false);
    }
  }, [setQuotes]);

  useEffect(() => {
    void loadAllQuotes();
  }, [loadAllQuotes]);

  const visibleQuotes = useMemo(() => {
    if (themeFilter === "all") {
      return quotes;
    }

    return quotes.filter((quote) => quote.theme === themeFilter);
  }, [quotes, themeFilter]);

  const leafQuotes = useMemo(
    () => buildLeafQuoteMap(visibleQuotes, treeSeed ?? 1, MESSAGE_LEAF_COUNT),
    [treeSeed, visibleQuotes],
  );

  const quoteById = useMemo(() => {
    const map = new Map<string, Quote>();

    for (const quote of quotes) {
      map.set(quote.id, quote);
    }

    if (activeQuote) {
      map.set(activeQuote.id, activeQuote);
    }

    return map;
  }, [activeQuote, quotes]);

  const favoriteQuotes = useMemo(
    () => favorites.map((quoteId) => quoteById.get(quoteId)).filter((quote): quote is Quote => Boolean(quote)),
    [favorites, quoteById],
  );

  const themeContextLabel = useMemo(() => {
    if (themeFilter === "all") {
      return "Exploração livre";
    }

    return THEMES.find((theme) => theme.slug === themeFilter)?.label ?? "Exploração livre";
  }, [themeFilter]);

  const primaryActionLabel = themeFilter === "all" ? "Receber mensagem" : `Receber ${themeContextLabel.toLowerCase()}`;
  const floatingHintLabel =
    themeFilter === "all"
      ? "Toque uma folha luminosa"
      : `Toque uma folha de ${themeContextLabel.toLowerCase()}`;

  const dismissIntro = useCallback(() => {
    window.localStorage.setItem(INTRO_STORAGE_KEY, "1");
    setShowIntro(false);
  }, []);

  const isFavorite = activeQuote ? favorites.includes(activeQuote.id) : false;

  const closePanel = useCallback(() => {
    setPanelOpen(false);
  }, [setPanelOpen]);

  const showFavoriteMessage = useCallback((message: string) => {
    setFavoriteFeedback(message);

    if (favoriteFeedbackTimeout.current) {
      window.clearTimeout(favoriteFeedbackTimeout.current);
    }

    favoriteFeedbackTimeout.current = window.setTimeout(() => setFavoriteFeedback(null), 1800);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setFavoritesOpen(false);
        setPanelOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [setPanelOpen]);

  // ------------------------------------------------- fluxo da folha-mensagem
  const requestRandomLeaf = useCallback(() => {
    if (visibleQuotes.length === 0) {
      return;
    }

    playRandom();
    setFavoritesOpen(false);
    setShowHint(false);
    dismissIntro();
    sceneApiRef.current?.pickRandomLeaf();
  }, [dismissIntro, playRandom, visibleQuotes.length]);

  /** a folha se soltou da árvore: reserva a frase, mas só abre no pouso */
  const handleLeafPick = useCallback(
    (leafIndex: number) => {
      const quote = leafQuotes[leafIndex] ?? visibleQuotes[0] ?? null;
      setPendingQuote(quote);
      setShowHint(false);
      dismissIntro();
      setFavoritesOpen(false);
      playClick();

      if (sessionId && quote) {
        void postInteraction({
          sessionId,
          actionType: "click",
          quoteId: quote.id,
          theme: themeFilter,
        });
      }
    },
    [dismissIntro, leafQuotes, playClick, sessionId, themeFilter, visibleQuotes],
  );

  /** a folha pousou diante da câmera: agora sim mostramos a mensagem */
  const handleLeafArrive = useCallback(() => {
    if (!pendingQuote) {
      return;
    }

    setActiveQuote(pendingQuote);
    setPanelOpen(true);
  }, [pendingQuote, setActiveQuote, setPanelOpen]);

  const handleLeafReleased = useCallback(() => {
    setPendingQuote(null);
  }, []);

  const handleFavorite = useCallback(() => {
    if (!activeQuote || !sessionId) {
      return;
    }

    const isNowFavorite = toggleFavorite(activeQuote.id);
    const nextFavorites = useQuoteStore.getState().favorites;

    saveFavorites(sessionId, nextFavorites);
    playFavorite();
    void postFavorite({ sessionId, quoteId: activeQuote.id, isFavorite: isNowFavorite });
    void postInteraction({
      sessionId,
      actionType: "favorite",
      quoteId: activeQuote.id,
      theme: themeFilter,
    });

    showFavoriteMessage(isNowFavorite ? "Guardada neste dispositivo." : "Removida das favoritas.");
  }, [activeQuote, playFavorite, sessionId, showFavoriteMessage, themeFilter, toggleFavorite]);

  const handleQualitySuggestion = useCallback(
    (nextProfile: QualityProfile) => {
      if (nextProfile === qualityProfile) {
        return;
      }

      setProfile(nextProfile);
      setQualityProfile(nextProfile);
    },
    [qualityProfile, setProfile, setQualityProfile],
  );

  const handleSelectFavorite = useCallback(
    (quote: Quote) => {
      setActiveQuote(quote);
      setPendingQuote(quote);
      setPanelOpen(true);
      setFavoritesOpen(false);
      setShowHint(false);
      dismissIntro();
    },
    [dismissIntro, setActiveQuote, setPanelOpen],
  );

  const handleThemeChange = useCallback(
    (nextTheme: Quote["theme"] | "all") => {
      if (nextTheme === themeFilter) {
        return;
      }

      playClick();
      setThemeFilter(nextTheme);
      setShowHint(false);
      dismissIntro();

      if (sessionId) {
        void postInteraction({ sessionId, actionType: "theme_filter", theme: nextTheme });
      }
    },
    [dismissIntro, playClick, sessionId, setThemeFilter, themeFilter],
  );

  const handleHoverChange = useCallback(
    (isHovering: boolean) => {
      if (!isHovering) {
        return;
      }

      setShowHint(false);
      const now = performance.now();
      if (now - hoverSoundCooldownRef.current > 550) {
        hoverSoundCooldownRef.current = now;
        playHover();
      }
    },
    [playHover],
  );

  const handleSceneApi = useCallback((api: TreeSceneApi) => {
    sceneApiRef.current = api;
  }, []);

  const handleKeyboardLeafPick = useCallback(
    (index: number) => {
      setFavoritesOpen(false);
      setShowHint(false);
      dismissIntro();
      sceneApiRef.current?.pickLeaf(index);
    },
    [dismissIntro],
  );

  const regenerateTree = useCallback(() => {
    setTreeSeed(createTreeSeed());
    setActiveQuote(null);
    setPendingQuote(null);
    setPanelOpen(false);
    setShowHint(true);
  }, [setActiveQuote, setPanelOpen]);

  const loadingOverlayVisible = loadingQuotes || !sceneReady || treeSeed === null;

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#0D1422] text-[#EAF2FB]">
      <h1 className="sr-only">Árvore das Emoções</h1>
      <p className="sr-only" aria-live="polite">
        Cada árvore é gerada do zero ao abrir a página. As folhas maiores e luminosas guardam
        mensagens: toque uma delas, ou use o botão de receber mensagem para abrir uma frase sem
        navegar na cena 3D. Escape fecha os painéis abertos.
      </p>

      {/*
        Caminho de teclado para a cena 3D: as folhas vivem dentro do canvas e nao
        recebem foco. Estes botoes ficam fora da tela, mas sao alcancaveis por
        Tab e por leitor de tela, e disparam exatamente a mesma animacao.
      */}
      <nav className="sr-only" aria-label="Folhas com mensagem">
        <ul>
          {Array.from({ length: MESSAGE_LEAF_COUNT }, (_, index) => (
            <li key={`leaf-shortcut-${index}`}>
              <button type="button" onClick={() => handleKeyboardLeafPick(index)}>
                Colher a folha {index + 1} de {MESSAGE_LEAF_COUNT}
                {leafQuotes[index] ? ` — tema ${themeLabel(leafQuotes[index]!.theme)}` : ""}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="absolute inset-0 z-0">
        {treeSeed !== null ? (
          <TreeScene
            seed={treeSeed}
            qualityProfile={qualityProfile}
            isMobile={isMobile}
            reduceMotion={reduceMotion}
            introActive={introLocked}
            messageOpen={panelOpen}
            quoteMappingKey={themeFilter}
            onSuggestProfile={handleQualitySuggestion}
            onSceneApi={handleSceneApi}
            onLeafPick={handleLeafPick}
            onLeafArrive={handleLeafArrive}
            onLeafReleased={handleLeafReleased}
            onHoverChange={handleHoverChange}
            onSceneReady={() => setSceneReady(true)}
          />
        ) : null}
      </div>

      <div className="pointer-events-none absolute inset-0 z-10">
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#0D1422]/16 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#0D1422]/80 to-transparent" />
        <AnimatePresence>
          {panelOpen && activeQuote ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
            />
          ) : null}
        </AnimatePresence>
      </div>

      <div className={`pointer-events-none absolute inset-0 z-20 ${introLocked ? "opacity-0" : "opacity-100"}`}>
        <div className="relative mx-auto h-full w-full max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, x: -14, y: -8 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="pointer-events-none absolute top-4 left-4 sm:top-6 sm:left-6 lg:top-8 lg:left-8"
          >
            <div className="flex items-start gap-2">
              <button
                type="button"
                onClick={() => setHudExpanded((current) => !current)}
                aria-label={hudExpanded ? "Recolher painel" : "Expandir painel"}
                aria-expanded={hudExpanded}
                className="hud-pill pointer-events-auto inline-flex h-10 w-10 items-center justify-center text-[#D6E2F0] transition hover:text-white"
              >
                {hudExpanded ? <ChevronLeft className="h-4 w-4" /> : <SlidersHorizontal className="h-4 w-4" />}
              </button>

              <AnimatePresence initial={false}>
                {hudExpanded ? (
                  <motion.div
                    key="corner-hud"
                    initial={{ opacity: 0, x: -8, scale: 0.98 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -10, scale: 0.98 }}
                    transition={{ duration: 0.24, ease: "easeOut" }}
                    className="pointer-events-auto w-[min(90vw,430px)] rounded-2xl border border-white/15 bg-[rgba(13,20,34,0.88)] p-3.5 sm:p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-semibold tracking-[0.24em] uppercase text-[#A5BCD0]">
                          Árvore das Emoções
                        </p>
                        <p className="mt-1 max-w-[32ch] text-[13px] leading-snug text-[#EBF0F6] sm:text-sm">
                          Uma árvore nova a cada visita. As folhas maiores guardam mensagens.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => setHudExpanded(false)}
                        aria-label="Recolher"
                        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[#D7E5F4] transition hover:bg-white/10 hover:text-white"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={requestRandomLeaf}
                        className="h-8 rounded-full bg-[#F2EFE8] px-4 text-[11px] font-bold text-[#1C1A17] transition hover:bg-white"
                      >
                        {primaryActionLabel}
                      </button>

                      {showIntro ? (
                        <button
                          type="button"
                          onClick={dismissIntro}
                          className="h-8 rounded-full border border-white/20 bg-white/10 px-4 text-[11px] font-medium text-white transition hover:bg-white/20"
                        >
                          Explorar livremente
                        </button>
                      ) : null}
                    </div>

                    {showIntro ? (
                      <div className="mt-3 space-y-1 rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-3 text-[11px] text-[#DCE7F2]/80">
                        <p>Procure as {MESSAGE_LEAF_COUNT} folhas maiores, com brilho dourado.</p>
                        <p>Toque em uma delas: ela se solta e traz a mensagem até você.</p>
                        <p>Guarde as frases que quiser revisitar depois.</p>
                      </div>
                    ) : null}

                    <div className="mt-3 space-y-2">
                      <p className="text-[11px] text-white/70">{themeContextLabel}</p>
                      <ThemeFilter themes={THEMES} value={themeFilter} onChange={handleThemeChange} />
                    </div>

                    <div className="mt-2.5 flex flex-wrap gap-1.5 sm:gap-2">
                      <button
                        type="button"
                        onClick={() => setFavoritesOpen((current) => !current)}
                        className="hud-pill h-7 px-2.5 text-[10px] transition"
                      >
                        <span className="inline-flex items-center gap-1.5">
                          <Heart className="h-3 w-3" />
                          Favoritas{favorites.length > 0 ? ` (${favorites.length})` : ""}
                        </span>
                      </button>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </motion.div>

          <AnimatePresence>
            {!panelOpen && showHint && !loadingOverlayVisible ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.3 }}
                className="hud-badge pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 text-[11px] tracking-[0.14em] uppercase text-[#DAE6F4]"
              >
                {floatingHintLabel}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {loadingOverlayVisible ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-[rgba(8,12,20,0.62)]"
          >
            <p className="text-xs tracking-[0.24em] uppercase text-[#D8E5F4]">
              {loadingQuotes ? "Carregando mensagens..." : "Plantando a árvore..."}
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {introLocked && !loadingOverlayVisible ? (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: "easeOut" }}
            className="pointer-events-none absolute inset-0 z-[25] bg-black"
          />
        ) : null}
      </AnimatePresence>

      <LeafMessageCard
        quote={activeQuote}
        open={panelOpen}
        isMobile={isMobile}
        isFavorite={isFavorite}
        favoriteCount={favorites.length}
        favoriteFeedback={favoriteFeedback}
        onFavorite={handleFavorite}
        onRandom={() => {
          closePanel();
          window.setTimeout(requestRandomLeaf, 520);
        }}
        onClose={closePanel}
        onOpenFavorites={() => setFavoritesOpen(true)}
      />

      <FavoritesDrawer
        open={favoritesOpen}
        quotes={favoriteQuotes}
        onClose={() => setFavoritesOpen(false)}
        onSelect={handleSelectFavorite}
      />

      <button
        type="button"
        onClick={regenerateTree}
        className="hud-pill pointer-events-auto absolute top-4 right-4 z-30 flex h-10 items-center gap-2 px-3 text-[10px] font-semibold tracking-[0.1em] uppercase sm:top-6 sm:right-6"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Nova árvore
      </button>

      {isMobile && !panelOpen ? (
        <button
          type="button"
          onClick={requestRandomLeaf}
          className="hud-pill pointer-events-auto fixed right-4 bottom-5 z-30 h-11 px-4 text-[11px] font-semibold tracking-[0.1em] uppercase"
        >
          {primaryActionLabel}
        </button>
      ) : null}
    </main>
  );
}
