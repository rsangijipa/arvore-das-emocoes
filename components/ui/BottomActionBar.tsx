"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  Check,
  Heart,
  HeartPulse,
  Moon,
  Palette,
  RefreshCw,
  SlidersHorizontal,
  Smile,
  Sparkles,
  Sun,
  Sunset,
  Volume2,
  VolumeX,
  Wind,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { ThemeFilter } from "@/components/ui/ThemeFilter";
import { THEMES } from "@/data/themes";
import { SPRING_FAST, TAP_BUTTON, TAP_CHIP } from "@/lib/utils/spring";
import type { SensoryMode } from "@/types/emotional-session";
import type { ThemeFilter as ThemeFilterValue } from "@/types/quote";
import type { SceneVariant } from "@/lib/theme/scene-variant";

type MenuId = "theme" | "emotions" | "sensations" | "daytime";

type BottomActionBarProps = {
  primaryLabel: string;
  onPrimary: () => void;
  themeValue: ThemeFilterValue;
  onThemeChange: (theme: ThemeFilterValue) => void;
  favoriteCount: number;
  favoritesOpen: boolean;
  onOpenFavorites: () => void;
  onRegenerate: () => void;
  onBreathing: () => void;
  onCheckIn: () => void;
  onCheckOut: () => void;
  sensoryMode: SensoryMode;
  onSensoryMode: (mode: SensoryMode) => void;
  sceneVariant: SceneVariant;
  onSceneVariantChange: (variant: SceneVariant) => void;
  audioEnabled: boolean;
  muted: boolean;
  onToggleMute: () => void;
};

const BAR_TRANSITION = { type: "spring" as const, stiffness: 320, damping: 34, mass: 0.9 };
const POPOVER_TRANSITION = { type: "spring" as const, stiffness: 420, damping: 32 };

const SENSORY_OPTIONS: { value: SensoryMode; label: string; description: string }[] = [
  { value: "default", label: "Completo", description: "Vento, partículas e brilho das folhas" },
  { value: "calm", label: "Calmo", description: "Movimento suavizado, cena mais serena" },
  { value: "minimal", label: "Mínimo", description: "Cena estática, sem partículas" },
];

const DAYTIME_OPTIONS: { value: SceneVariant; label: string; description: string; icon: typeof Sun }[] = [
  { value: "morning", label: "Manhã", description: "Luz suave e horizonte claro", icon: Sun },
  { value: "evening", label: "Tarde", description: "Céu dourado e atmosfera calorosa", icon: Sunset },
  { value: "night", label: "Noite", description: "Céu estrelado e folhas luminosas", icon: Moon },
];

export function BottomActionBar({
  primaryLabel,
  onPrimary,
  themeValue,
  onThemeChange,
  favoriteCount,
  favoritesOpen,
  onOpenFavorites,
  onRegenerate,
  onBreathing,
  onCheckIn,
  onCheckOut,
  sensoryMode,
  onSensoryMode,
  sceneVariant,
  onSceneVariantChange,
  audioEnabled,
  muted,
  onToggleMute,
}: BottomActionBarProps) {
  const [menu, setMenu] = useState<MenuId | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menu) {
      return;
    }

    const onPointerDown = (event: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(event.target as Node)) {
        setMenu(null);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenu(null);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menu]);

  const toggleMenu = (next: MenuId) => {
    setMenu((current) => (current === next ? null : next));
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 88 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 84, transition: { duration: 0.18, ease: "easeIn" } }}
      transition={BAR_TRANSITION}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40"
    >
      <div
        ref={wrapRef}
        className="pointer-events-auto mx-auto w-[calc(100%-1.5rem)] max-w-[680px] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <div className="relative">
          <AnimatePresence mode="wait">
            {menu ? (
              <motion.div
                key={menu}
                initial={{ opacity: 0, y: 12, scale: 0.96, x: "-50%" }}
                animate={{ opacity: 1, y: 0, scale: 1, x: "-50%", transition: POPOVER_TRANSITION }}
                exit={{ opacity: 0, y: 8, scale: 0.97, x: "-50%", transition: { duration: 0.14, ease: "easeIn" } }}
                className="hud-panel absolute bottom-[calc(100%+0.5rem)] left-1/2 z-10 w-[min(92vw,460px)] p-4"
                role="group"
                aria-label={
                  menu === "theme" ? "Filtro de temas" : menu === "emotions" ? "Check-in emocional" : "Modo sensorial"
                }
              >
                {menu === "theme" ? (
                  <>
                    <p className="mb-2.5 text-[9px] font-semibold tracking-[0.22em] uppercase text-[#8FA6BD]">
                      Tema das mensagens
                    </p>
                    <ThemeFilter themes={THEMES} value={themeValue} onChange={onThemeChange} />
                  </>
                ) : null}

                {menu === "emotions" ? (
                  <div className="flex flex-col gap-1.5">
                    <motion.button
                      {...TAP_CHIP}
                      type="button"
                      onClick={onCheckIn}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-left hover:bg-white/10"
                    >
                      <HeartPulse className="h-4 w-4 shrink-0 text-[#F4D58D]" aria-hidden />
                      <span className="text-[13px] text-[#E7EEF7]">Como você está chegando hoje?</span>
                    </motion.button>
                    <motion.button
                      {...TAP_CHIP}
                      type="button"
                      onClick={onCheckOut}
                      className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-3.5 py-3 text-left hover:bg-white/10"
                    >
                      <Smile className="h-4 w-4 shrink-0 text-[#9FCFCA]" aria-hidden />
                      <span className="text-[13px] text-[#E7EEF7]">Como você está agora?</span>
                    </motion.button>
                  </div>
                ) : null}

                {menu === "sensations" ? (
                  <>
                    <p className="mb-2.5 text-[9px] font-semibold tracking-[0.22em] uppercase text-[#8FA6BD]">
                      Modo sensorial
                    </p>
                    <div role="radiogroup" aria-label="Modo sensorial" className="flex flex-col gap-1.5">
                      {SENSORY_OPTIONS.map((option) => {
                        const active = sensoryMode === option.value;
                        return (
                          <motion.button
                            key={option.value}
                            {...TAP_CHIP}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => onSensoryMode(option.value)}
                            className={`flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition-colors ${
                              active
                                ? "border-[#F0CF8E]/50 bg-white/[0.13]"
                                : "border-white/10 bg-white/[0.04] hover:bg-white/10"
                            }`}
                          >
                            <span>
                              <span className="block text-[13px] font-semibold text-[#E7EEF7]">{option.label}</span>
                              <span className="block text-[11px] leading-snug text-[#9FB4C8]">{option.description}</span>
                            </span>
                            <AnimatePresence>
                              {active ? (
                                <motion.span
                                  initial={{ opacity: 0, scale: 0.5 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.5 }}
                                  transition={SPRING_FAST}
                                >
                                  <Check className="h-4 w-4 text-[#F0CF8E]" aria-hidden />
                                </motion.span>
                              ) : null}
                            </AnimatePresence>
                          </motion.button>
                        );
                      })}
                    </div>
                  </>
                ) : null}

                {menu === "daytime" ? (
                  <>
                    <p className="mb-2.5 text-[9px] font-semibold tracking-[0.22em] uppercase text-[#8FA6BD]">
                      Período do dia
                    </p>
                    <div role="radiogroup" aria-label="Período do dia" className="flex flex-col gap-1.5">
                      {DAYTIME_OPTIONS.map((option) => {
                        const Icon = option.icon;
                        const active = sceneVariant === option.value;
                        return (
                          <motion.button
                            key={option.value}
                            {...TAP_CHIP}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => {
                              onSceneVariantChange(option.value);
                              setMenu(null);
                            }}
                            className={`flex items-center justify-between gap-3 rounded-2xl border px-3.5 py-2.5 text-left transition-colors ${
                              active
                                ? "border-[#F0CF8E]/50 bg-white/[0.13]"
                                : "border-white/10 bg-white/[0.04] hover:bg-white/10"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <Icon className={`h-4 w-4 ${active ? "text-[#F0CF8E]" : "text-[#9FB4C8]"}`} aria-hidden />
                              <span>
                                <span className="block text-[13px] font-semibold text-[#E7EEF7]">{option.label}</span>
                                <span className="block text-[11px] leading-snug text-[#9FB4C8]">{option.description}</span>
                              </span>
                            </div>
                            <AnimatePresence>
                              {active ? (
                                <motion.span
                                  initial={{ opacity: 0, scale: 0.5 }}
                                  animate={{ opacity: 1, scale: 1 }}
                                  exit={{ opacity: 0, scale: 0.5 }}
                                  transition={SPRING_FAST}
                                >
                                  <Check className="h-4 w-4 text-[#F0CF8E]" aria-hidden />
                                </motion.span>
                              ) : null}
                            </AnimatePresence>
                          </motion.button>
                        );
                      })}
                    </div>
                  </>
                ) : null}
              </motion.div>
            ) : null}
          </AnimatePresence>

          <div className="hud-panel flex items-center gap-1 rounded-full py-2 pl-2 pr-2.5">
            <motion.button
              {...TAP_BUTTON}
              type="button"
              onClick={onPrimary}
              className="flex h-11 shrink-0 items-center gap-2 rounded-full bg-[#F2EFE8] pl-3.5 pr-4 text-[11.5px] font-bold tracking-[0.04em] text-[#1C1A17] hover:bg-white"
            >
              <Sparkles className="h-4 w-4" aria-hidden />
              <span className="max-sm:hidden">{primaryLabel}</span>
              <span className="sm:hidden">Mensagem</span>
            </motion.button>

            <span className="mx-1 h-7 w-px shrink-0 bg-white/12" aria-hidden />

            <div className="flex min-w-0 flex-1 items-center gap-0.5 overflow-x-auto pb-0.5 [scrollbar-width:none]">
              <BarIconButton
                icon={<Palette className="h-[18px] w-[18px]" aria-hidden />}
                label="Temas das mensagens"
                onClick={() => toggleMenu("theme")}
                active={menu === "theme"}
                expanded={menu === "theme"}
                dot={themeValue !== "all"}
              />
              <BarIconButton
                icon={<Heart className={`h-[18px] w-[18px] ${favoritesOpen ? "fill-current" : ""}`} aria-hidden />}
                label={`Favoritas (${favoriteCount})`}
                onClick={onOpenFavorites}
                active={favoritesOpen}
                badge={favoriteCount}
              />
              <BarIconButton
                icon={
                  <motion.span whileHover={{ rotate: 180 }} transition={{ type: "spring", stiffness: 180, damping: 16 }}>
                    <RefreshCw className="h-[18px] w-[18px]" aria-hidden />
                  </motion.span>
                }
                label="Gerar uma nova árvore"
                onClick={onRegenerate}
              />
              <BarIconButton
                icon={<Wind className="h-[18px] w-[18px]" aria-hidden />}
                label="Respirar com a folha"
                onClick={onBreathing}
              />
              <BarIconButton
                icon={<HeartPulse className="h-[18px] w-[18px]" aria-hidden />}
                label="Check-in emocional"
                onClick={() => toggleMenu("emotions")}
                active={menu === "emotions"}
                expanded={menu === "emotions"}
              />
              <BarIconButton
                icon={<SlidersHorizontal className="h-[18px] w-[18px]" aria-hidden />}
                label="Modo sensorial"
                onClick={() => toggleMenu("sensations")}
                active={menu === "sensations"}
                expanded={menu === "sensations"}
                dot={sensoryMode !== "default"}
              />
              <BarIconButton
                icon={
                  sceneVariant === "night" ? (
                    <Moon className="h-[18px] w-[18px]" aria-hidden />
                  ) : sceneVariant === "evening" ? (
                    <Sunset className="h-[18px] w-[18px]" aria-hidden />
                  ) : (
                    <Sun className="h-[18px] w-[18px]" aria-hidden />
                  )
                }
                label="Alterar período do dia (Manhã, Tarde, Noite)"
                onClick={() => toggleMenu("daytime")}
                active={menu === "daytime"}
                expanded={menu === "daytime"}
              />
              {audioEnabled ? (
                <BarIconButton
                  icon={muted ? <VolumeX className="h-[18px] w-[18px]" aria-hidden /> : <Volume2 className="h-[18px] w-[18px]" aria-hidden />}
                  label={muted ? "Ativar som" : "Silenciar"}
                  onClick={onToggleMute}
                  dot={muted}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function BarIconButton({
  icon,
  label,
  onClick,
  active = false,
  dot = false,
  badge = 0,
  expanded,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  active?: boolean;
  dot?: boolean;
  badge?: number;
  expanded?: boolean;
}) {
  return (
    <motion.button
      {...TAP_BUTTON}
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-expanded={expanded}
      className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-colors ${
        active ? "bg-white/16 text-white" : "text-[#C7D6E6] hover:bg-white/10 hover:text-white"
      }`}
    >
      {icon}
      {badge > 0 ? (
        <span
          className="absolute right-0.5 top-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[#E6C978] px-1 text-[10px] font-bold leading-none text-[#241B08]"
          aria-hidden
        >
          {badge > 99 ? "99+" : badge}
        </span>
      ) : dot ? (
        <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-[#E6C978]" aria-hidden />
      ) : null}
    </motion.button>
  );
}
