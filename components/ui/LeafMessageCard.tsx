"use client";

import { AnimatePresence, motion } from "motion/react";
import { Heart, Shuffle, X } from "lucide-react";

import { LeafSvg } from "@/components/ui/LeafSvg";
import { themeLabel, toneLabel } from "@/data/labels";
import type { Quote } from "@/types/quote";

type LeafMessageCardProps = {
  quote: Quote | null;
  open: boolean;
  isMobile: boolean;
  isFavorite: boolean;
  favoriteCount: number;
  favoriteFeedback: string | null;
  onFavorite: () => void;
  onRandom: () => void;
  onClose: () => void;
  onOpenFavorites: () => void;
};

/**
 * Cada mensagem ganha um tipo de letra proprio, escolhido de forma estavel a
 * partir do id da frase: a mesma folha sempre traz a mesma caligrafia.
 */
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

export function LeafMessageCard({
  quote,
  open,
  isMobile,
  isFavorite,
  favoriteCount,
  favoriteFeedback,
  onFavorite,
  onRandom,
  onClose,
  onOpenFavorites,
}: LeafMessageCardProps) {
  const font = MESSAGE_FONTS[quote ? hashText(quote.id) % MESSAGE_FONTS.length : 0];

  // no retrato a folha fica em pe (girada), no desktop deitada
  const leafWidth = isMobile ? "min(150vh, 168vw)" : "min(78vw, 1180px)";
  const textWidth = isMobile ? "min(76vw, 420px)" : "min(40vw, 620px)";

  return (
    <div className="pointer-events-none fixed inset-0 z-30">
      <AnimatePresence mode="wait">
        {open && quote ? (
          <motion.div
            key={quote.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute inset-0 flex flex-col items-center justify-center"
          >
            <div
              className="relative flex items-center justify-center"
              style={{ width: leafWidth, transform: isMobile ? "rotate(-90deg)" : undefined }}
            >
              <motion.div
                initial={{ opacity: 0, scale: 0.9, rotate: isMobile ? 4 : -3 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.94 }}
                transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
                className="w-full"
              >
                <LeafSvg id={`leaf-${quote.id}`} className="w-full" />
              </motion.div>
            </div>

            <motion.figure
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.5, delay: 0.22, ease: "easeOut" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center"
              style={{ width: textWidth }}
            >
              <figcaption className="mb-3 text-[10px] font-bold tracking-[0.3em] uppercase text-[#E3C88C]">
                Mensagem encontrada
              </figcaption>

              <blockquote
                className="text-[#F7EEDB] drop-shadow-[0_2px_10px_rgba(0,0,0,0.55)]"
                style={{
                  fontFamily: font.family,
                  fontWeight: font.weight,
                  letterSpacing: font.tracking,
                  fontSize: isMobile
                    ? `calc(clamp(1.1rem, 4.6vw, 1.75rem) * ${font.size})`
                    : `calc(clamp(1.4rem, 2.5vw, 2.5rem) * ${font.size})`,
                  lineHeight: 1.3,
                }}
              >
                {quote.text}
              </blockquote>

              <div className="mt-5 flex flex-wrap items-center justify-center gap-2 text-[9px] font-semibold tracking-[0.18em] uppercase text-[#E8D7AE]/85">
                <span className="rounded-full border border-[#E8D7AE]/30 bg-black/25 px-3 py-1">
                  {themeLabel(quote.theme)}
                </span>
                <span className="rounded-full border border-[#E8D7AE]/30 bg-black/25 px-3 py-1">
                  {toneLabel(quote.tone)}
                </span>
                {quote.author ? (
                  <span className="rounded-full border border-[#E8D7AE]/30 bg-black/25 px-3 py-1">
                    {quote.author}
                  </span>
                ) : null}
              </div>
            </motion.figure>

            <motion.div
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              transition={{ duration: 0.4, delay: 0.34, ease: "easeOut" }}
              className="pointer-events-auto absolute inset-x-0 bottom-[max(1.5rem,env(safe-area-inset-bottom))] flex flex-col items-center gap-3 px-4"
            >
              <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={onFavorite}
                  aria-pressed={isFavorite}
                  className={`flex h-11 items-center gap-2 rounded-full border px-5 text-[11px] font-bold tracking-[0.12em] uppercase transition ${
                    isFavorite
                      ? "border-[#E6C978] bg-[#E6C978]/25 text-[#FFF4D6]"
                      : "border-white/25 bg-black/45 text-white/85 hover:bg-black/60"
                  }`}
                >
                  <Heart className={`h-4 w-4 ${isFavorite ? "fill-[#E6C978]" : ""}`} aria-hidden />
                  {isFavorite ? "Guardada" : "Guardar"}
                </button>

                <button
                  type="button"
                  onClick={onRandom}
                  className="flex h-11 items-center gap-2 rounded-full border border-[#9EC6BA]/40 bg-black/45 px-5 text-[11px] font-bold tracking-[0.12em] uppercase text-[#E7F2EE] transition hover:bg-black/60"
                >
                  <Shuffle className="h-3.5 w-3.5" aria-hidden />
                  Outra folha
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-11 items-center gap-2 rounded-full border border-white/20 bg-black/40 px-5 text-[11px] font-bold tracking-[0.12em] uppercase text-white/80 transition hover:bg-black/55"
                >
                  <X className="h-3.5 w-3.5" aria-hidden />
                  Voltar à árvore
                </button>
              </div>

              <button
                type="button"
                onClick={onOpenFavorites}
                className="text-[10px] font-semibold tracking-[0.18em] uppercase text-white/55 transition hover:text-white/85"
              >
                Favoritas ({favoriteCount})
              </button>

              <p className="min-h-[18px] text-[11px] text-[#F0DFB4]" aria-live="polite">
                {favoriteFeedback}
              </p>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
