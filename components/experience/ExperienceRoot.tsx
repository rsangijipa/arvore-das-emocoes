"use client";

import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { FavoritesDrawer } from "@/components/ui/FavoritesDrawer";
import { EmotionalCheckIn } from "@/components/experience/EmotionalCheckIn";
import { BreathingLeaf } from "@/components/experience/BreathingLeaf";
import { LeafMessageCard } from "@/components/ui/LeafMessageCard";
import { BottomActionBar } from "@/components/ui/BottomActionBar";
import { themeLabel } from "@/data/labels";
import { THEMES } from "@/data/themes";
import { usePerformanceMode } from "@/hooks/usePerformanceMode";
import { useReducedMotionPreference } from "@/hooks/useReducedMotionPreference";
import { useSessionId } from "@/hooks/useSessionId";
import { useEmotionalSession } from "@/hooks/useEmotionalSession";
import { useFavoritesSync } from "@/hooks/useFavoritesSync";
import { useSoundscape } from "@/hooks/useSoundscape";
import { soundscape } from "@/lib/audio/soundscape";
import { postFavorite, postInteraction } from "@/lib/client/interactions-api";
import { fetchQuotesByTheme } from "@/lib/client/quote-api";
import { createTreeSeed, MESSAGE_LEAF_COUNT } from "@/lib/theme/scene-tokens";
import type { SceneVariant } from "@/lib/theme/scene-variant";
import { saveFavorites } from "@/lib/utils/local-favorites";
import { INTRO_STORAGE_KEY, migrateLegacyStorage } from "@/lib/utils/storage";
import type { TreeSceneApi } from "@/components/3d/TreeScene";
import { useQuoteStore } from "@/store/useQuoteStore";
import type { QualityProfile } from "@/types/performance";
import type { Quote } from "@/types/quote";
import { getEmotionalSceneProfile, type Emotion, type SensoryMode } from "@/types/emotional-session";

const TreeScene = dynamic(() => import("@/components/3d/TreeScene"), {
  ssr: false,
  loading: () => null,
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
  const emotionalSession = useEmotionalSession(sessionId);
  useFavoritesSync(sessionId);
  const { profile, setProfile } = usePerformanceMode();
  const reduceMotion = useReducedMotionPreference();

  const [isMobile, setIsMobile] = useState(false);
  const [loadingQuotes, setLoadingQuotes] = useState(true);
  const [sceneReady, setSceneReady] = useState(false);
  const [introLocked, setIntroLocked] = useState(true);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [favoriteFeedback, setFavoriteFeedback] = useState<string | null>(null);
  /** ambiente visual: Manhã, Tarde, Noite */
  const [sceneVariant, setSceneVariant] = useState<SceneVariant>(() => {
    if (typeof window === "undefined") return "morning";
    const saved = window.localStorage.getItem("arvore-scene-variant");
    if (saved === "morning" || saved === "day" || saved === "evening" || saved === "night") {
      return saved;
    }
    return "morning";
  });
  /** true enquanto a folha animada ainda não voltou à copa após fechar o painel */
  const [isLeafReturning, setIsLeafReturning] = useState(false);
  /** quantas folhas foram lidas nesta sessão de árvore */
  const [readLeafCount, setReadLeafCount] = useState(0);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [sensoryMode, setSensoryMode] = useState<SensoryMode>("default");
  const [webglUnavailable, setWebglUnavailable] = useState(false);
  const [breathingOpen, setBreathingOpen] = useState(false);

  // a árvore é sorteada a cada abertura (nunca durante o render do servidor)
  const [treeSeed, setTreeSeed] = useState<number | null>(null);
  const [pendingQuote, setPendingQuote] = useState<Quote | null>(null);

  /** API imperativa da cena 3D (entregue por onSceneApi) */
  const sceneApiRef = useRef<TreeSceneApi | null>(null);

  const favoriteFeedbackTimeout = useRef<number | null>(null);
  const hoverSoundCooldownRef = useRef(0);

  const { playFavorite, playHover, playRandom, playClick, muted, toggleMute } = useSoundscape(true);

  const quotes = useQuoteStore((state) => state.quotes);
  const activeQuote = useQuoteStore((state) => state.activeQuote);
  const themeFilter = useQuoteStore((state) => state.themeFilter);
  const favorites = useQuoteStore((state) => state.favorites);
  const panelOpen = useQuoteStore((state) => state.panelOpen);
  const qualityProfile = useQuoteStore((state) => state.qualityProfile);
  const setQuotes = useQuoteStore((state) => state.setQuotes);
  const setActiveQuote = useQuoteStore((state) => state.setActiveQuote);
  const setThemeFilter = useQuoteStore((state) => state.setThemeFilter);
  const toggleFavorite = useQuoteStore((state) => state.toggleFavorite);
  const setPanelOpen = useQuoteStore((state) => state.setPanelOpen);
  const setQualityProfile = useQuoteStore((state) => state.setQualityProfile);

  // -------------------------------------------------------------- bootstrap
  useEffect(() => {
    migrateLegacyStorage();
    setTreeSeed(createTreeSeed());
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem("arvore-sensory-mode");
    if (saved === "calm" || saved === "minimal") setSensoryMode(saved);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("arvore-sensory-mode", sensoryMode);
  }, [sensoryMode]);

  useEffect(() => {
    window.localStorage.setItem("arvore-scene-variant", sceneVariant);
    soundscape.setTimeOfDay(sceneVariant);
  }, [sceneVariant]);

  const handleSceneVariantChange = useCallback(
    (variant: SceneVariant) => {
      if (variant === sceneVariant) {
        return;
      }

      playClick();
      setSceneVariant(variant);
    },
    [playClick, sceneVariant],
  );

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

  const loadAllQuotes = useCallback(async () => {
    setLoadingQuotes(true);

    try {
      const payload = await fetchQuotesByTheme("all");
      setQuotes(payload.quotes);
    } catch {
      // a cena continua utilizável mesmo sem rede
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

  const markIntroSeen = useCallback(() => {
    window.localStorage.setItem(INTRO_STORAGE_KEY, "1");
  }, []);

  const isFavorite = activeQuote ? favorites.includes(activeQuote.id) : false;

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    setIsLeafReturning(true);
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
    markIntroSeen();
    sceneApiRef.current?.pickRandomLeaf();
  }, [markIntroSeen, playRandom, visibleQuotes.length]);

  /** a folha se soltou da árvore: reserva a frase, mas só abre no pouso */
  const handleLeafPick = useCallback(
    (leafIndex: number) => {
      const quote = leafQuotes[leafIndex] ?? visibleQuotes[0] ?? null;
      setPendingQuote(quote);
      markIntroSeen();
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
    [leafQuotes, markIntroSeen, playClick, sessionId, themeFilter, visibleQuotes],
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
    setIsLeafReturning(false);
    setReadLeafCount((n) => n + 1);
  }, []);

  const completeCheckIn = useCallback(
    (emotion: Emotion, intensity: number) => {
      emotionalSession.checkIn(emotion, intensity);
      setCheckInOpen(false);
    },
    [emotionalSession],
  );

  const completeCheckOut = useCallback(
    (emotion: Emotion, intensity: number) => {
      emotionalSession.checkOut(emotion, intensity);
      setCheckOutOpen(false);
    },
    [emotionalSession],
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

    showFavoriteMessage(isNowFavorite ? "Guardada neste dispositivo." : "Removida das favoritas.");
  }, [activeQuote, playFavorite, sessionId, showFavoriteMessage, themeFilter, toggleFavorite]);

  const handleRemoveFavorite = useCallback(
    (quoteId: string) => {
      if (!sessionId) return;
      toggleFavorite(quoteId);
      const nextFavorites = useQuoteStore.getState().favorites;
      saveFavorites(sessionId, nextFavorites);
      void postFavorite({ sessionId, quoteId, isFavorite: false });
      showFavoriteMessage("Removida das favoritas.");
    },
    [sessionId, showFavoriteMessage, toggleFavorite],
  );

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
      markIntroSeen();
    },
    [markIntroSeen, setActiveQuote, setPanelOpen],
  );

  const handleThemeChange = useCallback(
    (nextTheme: Quote["theme"] | "all") => {
      if (nextTheme === themeFilter) {
        return;
      }

      playClick();
      setThemeFilter(nextTheme);
      markIntroSeen();

      if (sessionId) {
        void postInteraction({ sessionId, actionType: "theme_filter", theme: nextTheme });
      }
    },
    [markIntroSeen, playClick, sessionId, setThemeFilter, themeFilter],
  );

  const handleHoverChange = useCallback(
    (isHovering: boolean) => {
      if (!isHovering) {
        return;
      }

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
      markIntroSeen();
      sceneApiRef.current?.pickLeaf(index);
    },
    [markIntroSeen],
  );

  const regenerateTree = useCallback(() => {
    setTreeSeed(createTreeSeed());
    setActiveQuote(null);
    setPendingQuote(null);
    setPanelOpen(false);
    setReadLeafCount(0);
    setIsLeafReturning(false);
  }, [setActiveQuote, setPanelOpen]);

  const loadingOverlayVisible = loadingQuotes || !sceneReady || treeSeed === null;
  const completedActivities = emotionalSession.session.activities.filter((activity) => activity.completed).length;
  const emotionalProfile = getEmotionalSceneProfile(
    emotionalSession.session.emotionBefore,
    emotionalSession.session.intensityBefore,
    completedActivities,
  );
  const barVisible = !panelOpen && !loadingOverlayVisible && !introLocked;

  return (
    <main
      className="relative h-dvh w-full overflow-hidden bg-[#0D1422] text-[#EAF2FB]"
      aria-busy={loadingOverlayVisible}
    >
      <h1 className="sr-only">Árvore das Emoções</h1>
      <p className="sr-only">
        Cada árvore é gerada do zero ao abrir a página. As folhas maiores e luminosas guardam mensagens: toque uma
        delas, ou use o botão de receber mensagem na barra inferior. Escape fecha os painéis abertos.
      </p>

      {/*
        Caminho de teclado para a cena 3D: as folhas vivem dentro do canvas e nao
        recebem foco. Estes botoes ficam fora da tela, mas sao alcancaveis por
        Tab e por leitor de tela, e disparam exatamente a mesma animacao.
      */}
      <nav className="sr-only" aria-label="Folhas com mensagem">
        <ul>
          {Array.from({ length: MESSAGE_LEAF_COUNT }, (_, index) => {
            const q = leafQuotes[index];
            if (!q) return null;
            return (
              <li key={`leaf-shortcut-${index}`}>
                <button type="button" onClick={() => handleKeyboardLeafPick(index)}>
                  Colher a folha {index + 1} de {MESSAGE_LEAF_COUNT} — tema {themeLabel(q.theme)}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="absolute inset-0 z-0">
        {treeSeed !== null ? (
          <TreeScene
            seed={treeSeed}
            qualityProfile={qualityProfile}
            isMobile={isMobile}
            reduceMotion={reduceMotion}
            sensoryMode={sensoryMode}
            emotionalProfile={emotionalProfile}
            introActive={introLocked}
            messageOpen={panelOpen}
            quoteMappingKey={themeFilter}
            sceneVariant={sceneVariant}
            onSuggestProfile={handleQualitySuggestion}
            onSceneApi={handleSceneApi}
            onLeafPick={handleLeafPick}
            onLeafArrive={handleLeafArrive}
            onLeafReleased={handleLeafReleased}
            onHoverChange={handleHoverChange}
            onSceneReady={() => setSceneReady(true)}
            onContextLost={() => setWebglUnavailable(true)}
            onContextRestored={() => setWebglUnavailable(false)}
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
              transition={{ duration: 0.45 }}
              className="absolute inset-0 bg-[#060B12]/72 backdrop-blur-[3px]"
            />
          ) : null}
        </AnimatePresence>
      </div>

      {/*
        Abertura silenciosa: nenhuma mensagem, painel ou dica aparece ao iniciar.
        A cena carrega sob um véu escuro e apenas o status invisível informa
        leitores de tela.
      */}
      <AnimatePresence>
        {loadingOverlayVisible ? (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="pointer-events-none absolute inset-0 z-30 bg-[#0A101B]"
          >
            <span role="status" aria-live="polite" className="sr-only">
              Preparando a árvore
            </span>
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
        reduceMotion={reduceMotion}
        isFavorite={isFavorite}
        favoriteCount={favorites.length}
        favoriteFeedback={favoriteFeedback}
        readCount={readLeafCount}
        totalLeaves={MESSAGE_LEAF_COUNT}
        isReturning={isLeafReturning}
        onFavorite={handleFavorite}
        onRandom={() => {
          closePanel();
          window.setTimeout(requestRandomLeaf, 520);
        }}
        onClose={closePanel}
        onOpenFavorites={() => setFavoritesOpen(true)}
      />

      <EmotionalCheckIn
        open={checkInOpen}
        title="Como você está chegando aqui hoje?"
        onComplete={completeCheckIn}
        onSkip={() => setCheckInOpen(false)}
      />
      <EmotionalCheckIn
        open={checkOutOpen}
        title="Como você está agora?"
        onComplete={completeCheckOut}
        onSkip={() => setCheckOutOpen(false)}
      />
      <BreathingLeaf
        open={breathingOpen}
        reduceMotion={reduceMotion}
        onStart={() => emotionalSession.startActivity("breathing")}
        onComplete={(durationMs) => emotionalSession.addActivity({ type: "breathing", durationMs, completed: true })}
        onClose={() => setBreathingOpen(false)}
      />

      {webglUnavailable ? (
        <div role="alert" className="hud-panel fixed inset-x-4 top-4 z-[60] mx-auto max-w-md p-4 text-center">
          <p className="text-sm text-[#E7EEF7]">A floresta precisa de um instante para voltar.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="hud-btn-primary mt-3 px-4 text-sm font-semibold"
          >
            Recarregar experiência
          </button>
        </div>
      ) : null}

      <FavoritesDrawer
        open={favoritesOpen}
        quotes={favoriteQuotes}
        onClose={() => setFavoritesOpen(false)}
        onSelect={handleSelectFavorite}
        onRemove={handleRemoveFavorite}
      />

      <AnimatePresence>
        {barVisible ? (
          <BottomActionBar
            primaryLabel={primaryActionLabel}
            onPrimary={requestRandomLeaf}
            themeValue={themeFilter}
            onThemeChange={handleThemeChange}
            favoriteCount={favorites.length}
            favoritesOpen={favoritesOpen}
            onOpenFavorites={() => setFavoritesOpen((current) => !current)}
            onRegenerate={regenerateTree}
            onBreathing={() => setBreathingOpen(true)}
            onCheckIn={() => setCheckInOpen(true)}
            onCheckOut={() => setCheckOutOpen(true)}
            sensoryMode={sensoryMode}
            onSensoryMode={setSensoryMode}
            sceneVariant={sceneVariant}
            onSceneVariantChange={handleSceneVariantChange}
            audioEnabled={true}
            muted={muted}
            onToggleMute={toggleMute}
          />
        ) : null}
      </AnimatePresence>
    </main>
  );
}
