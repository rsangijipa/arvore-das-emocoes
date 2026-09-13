"use client";

import { AnimatePresence, motion, useDragControls } from "motion/react";
import { Heart, Share2, Shuffle, X } from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";

import { LeafSvg, leafInkColor } from "@/components/ui/LeafSvg";
import { LEAF_CARD_FOUND_LABEL, themeLabel, toneLabel } from "@/data/labels";
import { SPRING_FAST, TAP_BUTTON } from "@/lib/utils/spring";
import type { Quote } from "@/types/quote";

type LeafMessageCardProps = {
  quote: Quote | null;
  open: boolean;
  isMobile: boolean;
  reduceMotion: boolean;
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
  { family: "var(--font-display), Georgia, serif", size: 1.04, tracking: "0em", weight: 600 },
  { family: "var(--font-display-alt), Georgia, serif", size: 0.94, tracking: "0.005em", weight: 500 },
  { family: "var(--font-hand), cursive", size: 1.2, tracking: "0.01em", weight: 600 },
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
  reduceMotion,
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

  const leafWidth = isMobile ? "min(138vh, 154vw)" : "min(88vw, 1320px)";
  const textWidth = isMobile ? "min(72vw, 380px)" : "min(40vw, 620px)";
  const textMarginLeft = isMobile ? "0" : "1.8%";
  const textMarginTop = isMobile ? "0.8%" : "0.5%";

  const dragControls = useDragControls();
  const handleDragEnd = useCallback(
    (_: unknown, info: { offset: { y: number } }) => {
      if (isMobile && info.offset.y > 90) onClose();
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
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center p-3"
          >
            {/* handle de drag — só mobile */}
            {isMobile && (
              <div
                className="absolute top-3 left-1/2 z-10 flex -translate-x-1/2 touch-none select-none flex-col items-center"
                onPointerDown={(e) => dragControls.start(e)}
                aria-hidden
              >
                <div className="h-1.5 w-11 rounded-full bg-white/35" />
              </div>
            )}

            <div
              className="relative flex items-center justify-center"
              style={{ width: leafWidth, transform: isMobile ? "rotate(-90deg)" : undefined }}
            >
              <motion.div
                className="w-full filter drop-shadow-[0_28px_52px_rgba(0,0,0,0.58)]"
                initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.54, rotate: isMobile ? 4 : -3 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.88 }}
                transition={reduceMotion ? { duration: 0.2 } : { duration: 0.62, ease: [0.18, 1, 0.26, 1] }}
              >
                <LeafSvg id={leafId} className="w-full" />
              </motion.div>
            </div>

            <motion.figure
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.45, delay: 0.42, ease: "easeOut" }}
              aria-label={LEAF_CARD_FOUND_LABEL}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center"
              style={{ width: textWidth, marginLeft: textMarginLeft, marginTop: textMarginTop }}
            >
              <span
                aria-hidden
                className="absolute inset-x-[-15%] inset-y-[-18%] rounded-full bg-[#FFFDF5]/28 blur-[44px]"
              />

              <figcaption
                className="relative mb-3.5 flex items-center justify-center gap-2 text-[10.5px] font-bold tracking-[0.32em] uppercase"
                style={{ color: ink, opacity: 0.65 }}
              >
                <span className="h-px w-6 bg-current opacity-30" />
                {LEAF_CARD_FOUND_LABEL}
                <span className="h-px w-6 bg-current opacity-30" />
              </figcaption>

              <motion.blockquote
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.42, delay: 0.55, ease: "easeOut" }}
                className="relative px-2"
                style={{
                  color: ink,
                  fontFamily: font.family,
                  fontWeight: font.weight,
                  letterSpacing: font.tracking,
                  fontSize: isMobile
                    ? `calc(clamp(1.18rem, 4.8vw, 1.9rem) * ${font.size})`
                    : `calc(clamp(1.5rem, 2.45vw, 2.65rem) * ${font.size})`,
                  lineHeight: 1.38,
                  textWrap: "balance",
                  textShadow: "0 1px 1px rgba(255,255,255,0.72)",
                }}
              >
                “{quote.text}”
              </motion.blockquote>

              <div className="relative mt-5 flex flex-wrap items-center justify-center gap-2 text-[9.5px] font-semibold tracking-[0.18em] uppercase">
                {[themeLabel(quote.theme), toneLabel(quote.tone), quote.author]
                  .filter((label): label is string => Boolean(label))
                  .map((label) => (
                    <motion.span
                      key={label}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 0.88, y: 0 }}
                      transition={{ duration: 0.3, delay: 0.72, ease: "easeOut" }}
                      className="rounded-full px-3 py-1 shadow-sm backdrop-blur-[2px]"
                      style={{
                        color: ink,
                        border: `1px solid color-mix(in srgb, ${ink} 34%, transparent)`,
                        background: "rgba(255,255,255,0.38)",
                      }}
                    >
                      {label}
                    </motion.span>
                  ))}
              </div>

              <div className="relative mt-4 flex flex-col items-center gap-1.5">
                {readCount > 0 ? (
                  <>
                    <motion.p
                      key={readCount}
                      initial={{ opacity: 0, y: 4, scale: 0.9 }}
                      animate={{ opacity: 0.42, y: 0, scale: 1 }}
                      transition={SPRING_FAST}
                      className="text-[9px] tracking-[0.18em] uppercase"
                      style={{ color: ink }}
                    >
                      {readCount} de {totalLeaves} folhas abertas
                    </motion.p>

                    <div className="flex items-center gap-1" aria-hidden>
                      {Array.from({ length: totalLeaves }, (_, index) => (
                        <motion.span
                          key={`progress-${index}`}
                          initial={{ opacity: 0, scale: 0 }}
                          animate={{
                            opacity: index < readCount ? 0.85 : 0.2,
                            scale: index === readCount - 1 ? 1.5 : 1,
                          }}
                          transition={SPRING_FAST}
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: index < readCount ? ink : "rgba(120, 110, 95, 0.24)" }}
                        />
                      ))}
                    </div>
                  </>
                ) : null}
              </div>
            </motion.figure>

            {/* ------------------------------------------------- controles */}
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.35, delay: 0.52, ease: "easeOut" }}
              className="pointer-events-auto absolute inset-x-0 bottom-[max(1.2rem,env(safe-area-inset-bottom))] flex flex-col items-center gap-2.5 px-4"
            >
              <div className="min-h-[22px]" aria-live="polite">
                <AnimatePresence>
                  {favoriteFeedback ?? shareFeedback ? (
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
                    onClick={() => {
                      void handleShare();
                    }}
                    icon={<Share2 className="h-4 w-4" aria-hidden />}
                    label="Compartilhar"
                  />
                )}

                <span className="mx-1 h-6 w-px bg-white/14" aria-hidden />

                <ControlButton onClick={onClose} icon={<X className="h-4 w-4" aria-hidden />} label="Voltar" />
              </div>

              <motion.button
                {...TAP_BUTTON}
                type="button"
                onClick={onOpenFavorites}
                className="flex h-10 items-center rounded-full px-4 text-[10px] font-semibold tracking-[0.18em] uppercase text-white/50 transition hover:bg-white/10 hover:text-white/90 active:bg-white/15"
              >
                Favoritas ({favoriteCount})
              </motion.button>
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
      {...(disabled ? {} : TAP_BUTTON)}
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      aria-pressed={ariaPressed}
      aria-label={label}
      whileHover={disabled ? undefined : { background: "rgba(255,255,255,0.1)" }}
      className={`flex h-12 items-center gap-2 rounded-full px-4 text-[11px] font-bold tracking-[0.1em] uppercase sm:h-11 ${
        disabled
          ? "cursor-not-allowed text-white/25"
          : active
            ? "bg-[#E6C978] text-[#241B08]"
            : "text-white/85"
      }`}
    >
      <motion.span
        animate={active ? { rotate: [0, -10, 0], scale: [1, 1.2, 1] } : {}}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {icon}
      </motion.span>
      <span>{label}</span>
    </motion.button>
  );
}
