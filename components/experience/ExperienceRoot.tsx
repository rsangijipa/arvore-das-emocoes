"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, Heart, SlidersHorizontal } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { FavoritesDrawer } from "@/components/ui/FavoritesDrawer";
import { MobileQuoteSheet } from "@/components/ui/MobileQuoteSheet";
import { QuotePanel } from "@/components/ui/QuotePanel";
import { ThemeFilter } from "@/components/ui/ThemeFilter";
import { usePerformanceMode } from "@/hooks/usePerformanceMode";
import { useSessionId } from "@/hooks/useSessionId";
import { useSoundscape } from "@/hooks/useSoundscape";
import { fetchFavorites, postFavorite, postInteraction } from "@/lib/client/interactions-api";
import { fetchQuotesByTheme, fetchRandomQuote } from "@/lib/client/quote-api";
import { DEFAULT_SCENE_MOOD, SCENE_MOOD_OPTIONS, inferSceneMoodByHour, type SceneMood } from "@/lib/theme/scene-tokens";
import { loadFavorites, saveFavorites } from "@/lib/utils/local-favorites";
import { useQuoteStore } from "@/store/useQuoteStore";
import type { QualityProfile } from "@/types/performance";
import type { Quote, ThemeFilter as ThemeFilterType } from "@/types/quote";

const REDUCE_MOTION_KEY = "harvore.reduceMotion";
const SCENE_MOOD_KEY = "harvore.sceneMood";

const TreeScene = dynamic(() => import("@/components/3d/TreeScene"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-xs tracking-[0.2em] uppercase text-[#DCE8F5]">
      Carregando atmosfera...
    </div>
  ),
});

export function ExperienceRoot() {
  const sessionId = useSessionId();
  const { profile, setProfile } = usePerformanceMode();

  const [isMobile, setIsMobile] = useState(false);
  const [loadingQuotes, setLoadingQuotes] = useState(true);
  const [sceneReady, setSceneReady] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [introLocked, setIntroLocked] = useState(true);
  const [showHint, setShowHint] = useState(true);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [favoriteFeedback, setFavoriteFeedback] = useState<string | null>(null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [sceneMood, setSceneMood] = useState<SceneMood>(DEFAULT_SCENE_MOOD);
  const [hudExpanded, setHudExpanded] = useState(false);

  const favoriteFeedbackTimeout = useRef<number | null>(null);
  const hoverSoundCooldownRef = useRef(0);
  const hudAutoCollapseDoneRef = useRef(false);

  const { playFavorite, playHover, playRandom } = useSoundscape(true);

  const quotes = useQuoteStore((state) => state.quotes);
  const themes = useQuoteStore((state) => state.themes);
  const activeQuote = useQuoteStore((state) => state.activeQuote);
  const themeFilter = useQuoteStore((state) => state.themeFilter);
  const favorites = useQuoteStore((state) => state.favorites);
  const panelOpen = useQuoteStore((state) => state.panelOpen);
  const qualityProfile = useQuoteStore((state) => state.qualityProfile);
  const setSessionId = useQuoteStore((state) => state.setSessionId);
  const setQuotes = useQuoteStore((state) => state.setQuotes);
  const setThemes = useQuoteStore((state) => state.setThemes);
  const setThemeFilter = useQuoteStore((state) => state.setThemeFilter);
  const setActiveQuote = useQuoteStore((state) => state.setActiveQuote);
  const toggleFavorite = useQuoteStore((state) => state.toggleFavorite);
  const setFavorites = useQuoteStore((state) => state.setFavorites);
  const setPanelOpen = useQuoteStore((state) => state.setPanelOpen);
  const setQualityProfile = useQuoteStore((state) => state.setQualityProfile);

  useEffect(() => {
    return () => {
      if (favoriteFeedbackTimeout.current) {
        window.clearTimeout(favoriteFeedbackTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    const onEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      setFavoritesOpen(false);
      setPanelOpen(false);
    };

    window.addEventListener("keydown", onEscape);
    return () => window.removeEventListener("keydown", onEscape);
  }, [setPanelOpen]);

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
    const stored = window.localStorage.getItem(REDUCE_MOTION_KEY);

    if (stored === "1") {
      setReduceMotion(true);
      return;
    }

    if (stored === "0") {
      setReduceMotion(false);
      return;
    }

    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduceMotion(media.matches);
  }, []);

  useEffect(() => {
    if (!sceneReady) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setIntroLocked(false);
    }, 1800);

    return () => window.clearTimeout(timeout);
  }, [sceneReady]);

  useEffect(() => {
    if (introLocked || hudAutoCollapseDoneRef.current) {
      return;
    }

    setHudExpanded(true);
    const timeout = window.setTimeout(() => {
      setHudExpanded(false);
      hudAutoCollapseDoneRef.current = true;
    }, 3200);

    return () => window.clearTimeout(timeout);
  }, [introLocked]);

  useEffect(() => {
    const stored = window.localStorage.getItem(SCENE_MOOD_KEY);
    if (!stored) {
      setSceneMood(inferSceneMoodByHour());
      return;
    }

    const isKnown = SCENE_MOOD_OPTIONS.some((option) => option.value === stored);
    if (isKnown) {
      setSceneMood(stored as SceneMood);
    }
  }, []);

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

    void fetchFavorites(sessionId)
      .then((cloudFavorites) => {
        if (cancelled) {
          return;
        }

        setFavorites(cloudFavorites);
        saveFavorites(sessionId, cloudFavorites);
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
      setThemes(payload.themes);
    } finally {
      setLoadingQuotes(false);
    }
  }, [setQuotes, setThemes]);

  useEffect(() => {
    void loadAllQuotes();
  }, [loadAllQuotes]);

  const themeLabelMap = useMemo(() => {
    const entries = themes.map((theme) => [theme.slug, theme.label] as const);
    return Object.fromEntries(entries) as Record<string, string>;
  }, [themes]);

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
      return "Exploracao livre";
    }

    return `Tema ativo: ${themeLabelMap[themeFilter] ?? themeFilter}`;
  }, [themeFilter, themeLabelMap]);

  const isFavorite = activeQuote ? favorites.includes(activeQuote.id) : false;

  const closePanel = useCallback(() => {
    setPanelOpen(false);
  }, [setPanelOpen]);

  const returnToTree = useCallback(() => {
    setActiveQuote(null);
    setPanelOpen(false);
  }, [setActiveQuote, setPanelOpen]);

  const showFavoriteMessage = useCallback((message: string) => {
    setFavoriteFeedback(message);

    if (favoriteFeedbackTimeout.current) {
      window.clearTimeout(favoriteFeedbackTimeout.current);
    }

    favoriteFeedbackTimeout.current = window.setTimeout(() => {
      setFavoriteFeedback(null);
    }, 1600);
  }, []);

  const handleThemeChange = useCallback(
    (theme: ThemeFilterType) => {
      setThemeFilter(theme);

      if (sessionId) {
        void postInteraction({ sessionId, actionType: "theme_filter", theme });
      }
    },
    [sessionId, setThemeFilter],
  );

  const handleRandomQuote = useCallback(async () => {
    const quote = await fetchRandomQuote(themeFilter, activeQuote?.id);

    playRandom();

    setActiveQuote(quote);
    setPanelOpen(true);
    setShowIntro(false);
    setShowHint(false);
    setFavoritesOpen(false);

    if (sessionId) {
      void postInteraction({
        sessionId,
        actionType: "random",
        quoteId: quote.id,
        theme: themeFilter,
      });
    }
  }, [activeQuote?.id, playRandom, sessionId, setActiveQuote, setPanelOpen, themeFilter]);

  const handleLeafQuoteSelect = useCallback(
    (quote: Quote) => {
      setActiveQuote(quote);
      setPanelOpen(true);
      setShowHint(false);
      setShowIntro(false);
      setFavoritesOpen(false);

      if (sessionId) {
        void postInteraction({
          sessionId,
          actionType: "click",
          quoteId: quote.id,
          theme: themeFilter,
        });
      }
    },
    [sessionId, setActiveQuote, setPanelOpen, themeFilter],
  );

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

    showFavoriteMessage(isNowFavorite ? "Salvo neste dispositivo." : "Removido das favoritas da sessao.");
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
      setPanelOpen(true);
      setFavoritesOpen(false);
      setShowHint(false);
      setShowIntro(false);
    },
    [setActiveQuote, setPanelOpen],
  );

  const toggleReduceMotion = useCallback(() => {
    setReduceMotion((current) => {
      const next = !current;
      window.localStorage.setItem(REDUCE_MOTION_KEY, next ? "1" : "0");
      return next;
    });
  }, []);

  const cycleSceneMood = useCallback(() => {
    setSceneMood((current) => {
      const index = SCENE_MOOD_OPTIONS.findIndex((option) => option.value === current);
      const next = SCENE_MOOD_OPTIONS[(index + 1) % SCENE_MOOD_OPTIONS.length]?.value ?? DEFAULT_SCENE_MOOD;
      window.localStorage.setItem(SCENE_MOOD_KEY, next);
      return next;
    });
  }, []);

  const sceneMoodLabel = useMemo(
    () => SCENE_MOOD_OPTIONS.find((option) => option.value === sceneMood)?.label ?? "Entardecer",
    [sceneMood],
  );

  const dismissIntro = useCallback(() => {
    setShowIntro(false);
  }, []);

  const handleLeafHoverStateChange = useCallback((isHovering: boolean) => {
    if (isHovering) {
      setShowHint(false);
      const now = performance.now();
      if (now - hoverSoundCooldownRef.current > 550) {
        hoverSoundCooldownRef.current = now;
        playHover();
      }
    }
  }, [playHover]);

  const loadingOverlayVisible = loadingQuotes || !sceneReady;

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-[#0D1422] text-[#EAF2FB]">
      <div className="absolute inset-0 z-0">
        <TreeScene
          quotes={quotes}
          qualityProfile={qualityProfile}
          selectedQuoteId={activeQuote?.id ?? null}
          sceneMood={sceneMood}
          sessionSeedKey={sessionId || null}
          activeTheme={themeFilter}
          reduceMotion={reduceMotion}
          introActive={introLocked}
          showTutorialMarkers={!panelOpen && !loadingOverlayVisible && showHint}
          onSuggestProfile={handleQualitySuggestion}
          onLeafQuoteSelect={handleLeafQuoteSelect}
          onLeafHoverStateChange={handleLeafHoverStateChange}
          onSceneReady={() => setSceneReady(true)}
        />
      </div>

      <div className="pointer-events-none absolute inset-0 z-10">
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-[#0D1422]/18 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-[#0D1422]/90 to-transparent" />
        <AnimatePresence>
          {panelOpen && activeQuote && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="absolute inset-0 bg-black/26 backdrop-blur-[1px]"
            />
          )}
        </AnimatePresence>
      </div>

      <div className={`pointer-events-none absolute inset-0 z-20 ${introLocked ? "opacity-0" : "opacity-100"}`}>
        <div className="relative mx-auto h-full w-full max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, x: -14, y: -8 }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="pointer-events-auto absolute top-4 left-4 sm:top-6 sm:left-6 lg:top-8 lg:left-8"
          >
            <div className="flex items-start gap-2">
              <button
                type="button"
                onClick={() => setHudExpanded((current) => !current)}
                aria-label={hudExpanded ? "Recolher painel" : "Expandir painel"}
                className="hud-pill inline-flex h-10 w-10 items-center justify-center text-[#D6E2F0] transition hover:text-white"
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
                    className="w-[min(90vw,430px)] rounded-2xl border border-white/15 bg-[rgba(13,20,34,0.42)] p-3.5 backdrop-blur-xl sm:p-4"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-[10px] font-semibold tracking-[0.24em] uppercase text-[#A5BCD0]">Arvore da Presenca</p>
                        <p className="mt-1 max-w-[32ch] text-[13px] leading-snug text-[#EBF0F6] sm:text-sm">
                          Interface viva para encontrar pequenas mensagens de coragem.
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

                    <div className="mt-3">
                      <ThemeFilter themes={themes} value={themeFilter} onChange={handleThemeChange} />
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleRandomQuote()}
                        aria-label="Receber mensagem"
                        className="h-8 rounded-full bg-[#F2EFE8] px-4 text-[11px] font-bold text-[#1C1A17] transition hover:bg-white"
                      >
                        Receber mensagem
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

                    <p className="mt-3 text-[11px] text-white/70">{themeContextLabel}</p>

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

                      <button
                        type="button"
                        onClick={toggleReduceMotion}
                        className="hud-pill h-7 px-2.5 text-[10px] transition"
                      >
                        {reduceMotion ? "Movimento reduzido" : "Movimento suave"}
                      </button>

                      <button
                        type="button"
                        onClick={cycleSceneMood}
                        className="hud-pill h-7 px-2.5 text-[10px] transition"
                      >
                        Clima: {sceneMoodLabel}
                      </button>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </motion.div>

          <AnimatePresence>
            {!activeQuote && showHint && !loadingOverlayVisible && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.3 }}
                className="hud-badge pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 text-[11px] tracking-[0.14em] uppercase text-[#DAE6F4]"
              >
                Toque uma folha
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {loadingOverlayVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center bg-[rgba(8,12,20,0.44)] backdrop-blur-[2px]"
          >
            <p className="text-xs tracking-[0.24em] uppercase text-[#D8E5F4]">Ajustando atmosfera...</p>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {introLocked && !loadingOverlayVisible && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            className="pointer-events-none absolute inset-0 z-[25] bg-black"
          />
        )}
      </AnimatePresence>

      {!isMobile && (
        <QuotePanel
          quote={activeQuote}
          panelOpen={panelOpen}
          themeLabel={themeContextLabel}
          isFavorite={isFavorite}
          favoriteCount={favorites.length}
          favoriteFeedback={favoriteFeedback}
          onClose={closePanel}
          onRandom={() => void handleRandomQuote()}
          onFavorite={handleFavorite}
          onBackToTree={returnToTree}
          onOpenFavorites={() => setFavoritesOpen(true)}
        />
      )}

      {isMobile && (
        <MobileQuoteSheet
          quote={activeQuote}
          panelOpen={panelOpen}
          themeLabel={themeContextLabel}
          isFavorite={isFavorite}
          favoriteCount={favorites.length}
          favoriteFeedback={favoriteFeedback}
          onFavorite={handleFavorite}
          onRandom={() => void handleRandomQuote()}
          onClose={closePanel}
          onBackToTree={returnToTree}
          onOpenFavorites={() => setFavoritesOpen(true)}
        />
      )}

      <FavoritesDrawer
        open={favoritesOpen}
        quotes={favoriteQuotes}
        onClose={() => setFavoritesOpen(false)}
        onSelect={handleSelectFavorite}
      />

      {!isMobile && activeQuote && !panelOpen && (
        <button
          type="button"
          onClick={() => setPanelOpen(true)}
          className="hud-pill absolute right-6 bottom-6 z-30 h-10 px-4 text-sm font-medium transition"
        >
          Abrir frase em destaque
        </button>
      )}

      {isMobile && !panelOpen && (
        <button
          type="button"
          onClick={() => {
            if (activeQuote) {
              setPanelOpen(true);
              return;
            }

            void handleRandomQuote();
          }}
          className="hud-pill fixed right-4 bottom-5 z-30 h-11 px-4 text-[11px] font-semibold tracking-[0.1em] uppercase"
        >
          {activeQuote ? "Abrir frase" : "Receber frase"}
        </button>
      )}
    </main>
  );
}
