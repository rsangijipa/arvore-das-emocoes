"use client";

import { AnimatePresence, motion, useDragControls } from "motion/react";
import { Heart, Share2, Shuffle, X } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

import { LeafSvg, leafInkColor } from "@/components/ui/LeafSvg";
import { LEAF_CARD_FOUND_LABEL, themeLabel, toneLabel } from "@/data/labels";
import type { Quote } from "@/types/quote";

type LeafMessageCardProps = {
  quote: Quote | null;
  open: boolean;
  isMobile: boolean;
  isFavorite: boolean;
  favoriteCount: number;
  favoriteFeedback: string | null;
  readCount: number;
  totalLeaves: number;
  isReturning: boolean;
  onFavorite: () => void;
  onRandom: () => void;
  onClose: () => void;
  onOpenFavorites: () => void;
};

const MESSAGE_FONTS = [
  { family: "var(--font-display), Georgia, serif", size: 1, tracking: "0em", weight: 600 },
  { family: "var(--font-display-alt), Georgia, serif", size: 0.9, tracking: "0.005em", weight: 500 },
  { family: "var(--font-hand), cursive", size: 1.16, tracking: "0.01em", weight: 600 },
] as const;

function hashText(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
}

/** Tenta usar a Web Share API; cai para clipboard se não suportada. */
async function shareQuote(quote: Quote): Promise<"shared" | "copied" | "error"> {
  const text = `"${quote.text}" — Árvore das Emoções`;
  try {
    if (typeof navigator !== "undefined" && navigator.share) {
      await navigator.share({ text });
      return "shared";
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return "copied";
    }
    return "error";
  } catch {
    return "error";
  }
}

export function LeafMessageCard({
  quote,
  open,
  isMobile,
  isFavorite,
  favoriteCount,
  favoriteFeedback,
  readCount,
  totalLeaves,
  isReturning,
  onFavorite,
  onRandom,
  onClose,
  onOpenFavorites,
}: LeafMessageCardProps) {
  const font = MESSAGE_FONTS[quote ? hashText(quote.id) % MESSAGE_FONTS.length : 0];
  const leafId = quote ? `leaf-${quote.id}` : "leaf-empty";
  const ink = useMemo(() => leafInkColor(leafId), [leafId]);

  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const shareFeedbackTimeout = useRef<number | null>(null);

  const leafWidth = isMobile ? "min(150vh, 168vw)" : "min(82vw, 1240px)";
  const textWidth = isMobile ? "min(70vw, 400px)" : "min(38vw, 600px)";
  const textMarginLeft = isMobile ? "0" : "1.6%";
  const textMarginTop  = isMobile ? "1.0%" : "0.6%";

  const dragControls = useDragControls();
  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { y: number } }) => {
      if (isMobile && info.offset.y > 100) onClose();
    },
    [isMobile, onClose],
  );

  const handleShare = useCallback(async () => {
    if (!quote) return;
    const result = await shareQuote(quote);
    const msg = result === "copied" ? "Copiado!" : null;
    if (msg) {
      setShareFeedback(msg);
      if (shareFeedbackTimeout.current) window.clearTimeout(shareFeedbackTimeout.current);
      shareFeedbackTimeout.current = window.setTimeout(() => setShareFeedback(null), 2000);
    }
  }, [quote]);

  const canShare = useMemo(
    () => typeof navigator !== "undefined" && (!!navigator.share || !!navigator.clipboard),
    [],
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      <AnimatePresence mode="wait">
        {open && quote ? (
          <motion.div
            key={quote.id}
            drag={isMobile ? "y" : false}
            dragControls={dragControls}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.2 }}
            onDragEnd={handleDragEnd}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center"
          >
            {/* handle de drag — só mobile */}
            {isMobile && (
              <div
                className="absolute top-3 left-1/2 z-10 flex -translate-x-1/2 touch-none select-none flex-col items-center"
                onPointerDown={(e) => dragControls.start(e)}
                aria-hidden
              >
                <div className="h-1 w-10 rounded-full bg-white/30" />
              </div>
            )}

            <div
              className="relative flex items-center justify-center"
              style={{ width: leafWidth, transform: isMobile ? "rotate(-90deg)" : undefined }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.46, rotate: isMobile ? 5 : -4 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.72, ease: [0.16, 1, 0.3, 1] }}
                className="w-full"
              >
                <LeafSvg id={leafId} className="w-full" />
              </motion.div>
            </div>

            <motion.figure
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.5, delay: 0.5, ease: "easeOut" }}
              aria-label={LEAF_CARD_FOUND_LABEL}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center"
              style={{ width: textWidth, marginLeft: textMarginLeft, marginTop: textMarginTop }}
            >
              <figcaption
                className="mb-3 text-[10px] font-bold tracking-[0.3em] uppercase"
                style={{ color: ink, opacity: 0.55 }}
              >
                {LEAF_CARD_FOUND_LABEL}
              </figcaption>

              <blockquote
                style={{
                  color: ink,
                  fontFamily: font.family,
                  fontWeight: font.weight,
                  letterSpacing: font.tracking,
                  fontSize: isMobile
                    ? `calc(clamp(1.05rem, 4.3vw, 1.7rem) * ${font.size})`
                    : `calc(clamp(1.35rem, 2.4vw, 2.4rem) * ${font.size})`,
                  lineHeight: 1.32,
                  textShadow: "0 1px 0 rgba(255,255,255,0.45)",
                }}
              >
                {quote.text}
              </blockquote>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-1.5 text-[9px] font-semibold tracking-[0.18em] uppercase">
                {[themeLabel(quote.theme), toneLabel(quote.tone), quote.author]
                  .filter((label): label is string => Boolean(label))
                  .map((label) => (
                    <span
                      key={label}
                      className="rounded-full px-2.5 py-1"
                      style={{
                        color: ink,
                        opacity: 0.72,
                        border: `1px solid color-mix(in srgb, ${ink} 26%, transparent)`,
                        background: "rgba(255,255,255,0.22)",
                      }}
                    >
                      {label}
                    </span>
                  ))}
              </div>

              {readCount > 0 && (
                <p
                  className="mt-4 text-[9px] tracking-[0.18em] uppercase"
                  style={{ color: ink, opacity: 0.38 }}
                >
                  {readCount} de {totalLeaves} descobertas
                </p>
              )}
            </motion.figure>

            {/* ------------------------------------------------- controles */}
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.4, delay: 0.62, ease: "easeOut" }}
              className="pointer-events-auto absolute inset-x-0 bottom-[max(1.25rem,env(safe-area-inset-bottom))] flex flex-col items-center gap-3 px-4"
            >
              <div className="min-h-[22px]" aria-live="polite">
                <AnimatePresence>
                  {(favoriteFeedback ?? shareFeedback) ? (
                    <motion.p
                      key={favoriteFeedback ?? shareFeedback}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="rounded-full border border-white/12 bg-black/55 px-3 py-1 text-[11px] text-[#F0DFB4] backdrop-blur-md"
                    >
                      {favoriteFeedback ?? shareFeedback}
                    </motion.p>
                  ) : null}
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-1 rounded-full border border-white/14 bg-black/60 p-1.5 shadow-[0_10px_34px_rgba(0,0,0,0.5)] backdrop-blur-xl">
                <ControlButton
                  onClick={onFavorite}
                  ariaPressed={isFavorite}
                  active={isFavorite}
                  icon={<Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} aria-hidden />}
                  label={isFavorite ? "Guardada" : "Guardar"}
                />

                <ControlButton
                  onClick={onRandom}
                  icon={<Shuffle className="h-4 w-4" aria-hidden />}
                  label="Outra folha"
                  disabled={isReturning}
                />

                {canShare && (
                  <ControlButton
                    onClick={() => { void handleShare(); }}
                    icon={<Share2 className="h-4 w-4" aria-hidden />}
                    label="Compartilhar"
                  />
                )}

                <span className="mx-1 h-6 w-px bg-white/14" aria-hidden />

                <ControlButton
                  onClick={onClose}
                  icon={<X className="h-4 w-4" aria-hidden />}
                  label="Voltar"
                />
              </div>

              <button
                type="button"
                onClick={onOpenFavorites}
                className="flex h-10 items-center rounded-full px-4 text-[10px] font-semibold tracking-[0.18em] uppercase text-white/50 transition hover:bg-white/10 hover:text-white/90 active:bg-white/15"
              >
                Favoritas ({favoriteCount})
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function ControlButton({
  onClick,
  icon,
  label,
  active = false,
  disabled = false,
  ariaPressed,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  disabled?: boolean;
  ariaPressed?: boolean;
}) {
  return (
    <motion.button
      whileTap={disabled ? {} : { scale: 0.94 }}
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-pressed={ariaPressed}
      aria-label={label}
      className={`flex h-12 items-center gap-2 rounded-full px-4 text-[11px] font-bold tracking-[0.1em] uppercase transition sm:h-11 ${
        disabled
          ? "cursor-not-allowed text-white/25"
          : active
            ? "bg-[#E6C978] text-[#241B08]"
            : "text-white/85 hover:bg-white/12 hover:text-white"
      }`}
    >
      {icon}
      <span>{label}</span>
    </motion.button>
  );
}
