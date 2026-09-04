"use client";

import { AnimatePresence, motion } from "motion/react";
import { Heart, Shuffle, X } from "lucide-react";
import { useMemo } from "react";

import { LeafSvg, leafInkColor } from "@/components/ui/LeafSvg";
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
  const leafId = quote ? `leaf-${quote.id}` : "leaf-empty";

  // a tinta acompanha o tom terroso sorteado para esta folha
  const ink = useMemo(() => leafInkColor(leafId), [leafId]);

  // no retrato a folha fica em pe (girada), no desktop deitada
  const leafWidth = isMobile ? "min(150vh, 168vw)" : "min(82vw, 1240px)";
  const textWidth = isMobile ? "min(70vw, 400px)" : "min(38vw, 600px)";

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
              {/*
                O cartao entra do tamanho em que a malha 3D se dissolveu e
                termina de crescer aqui: e a segunda metade do MESMO salto, nao
                uma folha nova aparecendo por cima da que voou.
              */}
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

            {/*
              O centro optico da lamina nao e o centro da tela: o desenho da
              folha coloca a area limpa levemente a direita e abaixo. O texto
              acompanha esse centro, senao encosta na nervura.
            */}
            <motion.figure
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.5, delay: 0.5, ease: "easeOut" }}
              className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center"
              style={{
                width: textWidth,
                marginLeft: isMobile ? 0 : "1.6%",
                marginTop: isMobile ? 0 : "0.6%",
              }}
            >
              <figcaption
                className="mb-3 text-[10px] font-bold tracking-[0.3em] uppercase"
                style={{ color: ink, opacity: 0.55 }}
              >
                Mensagem encontrada
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
            </motion.figure>

            {/* ------------------------------------------------- controles */}
            <motion.div
              initial={{ opacity: 0, y: 22 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.4, delay: 0.62, ease: "easeOut" }}
              className="pointer-events-auto absolute inset-x-0 bottom-[max(1.25rem,env(safe-area-inset-bottom))] flex flex-col items-center gap-2 px-4"
            >
              <div className="min-h-[22px]" aria-live="polite">
                <AnimatePresence>
                  {favoriteFeedback ? (
                    <motion.p
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="rounded-full border border-white/12 bg-black/55 px-3 py-1 text-[11px] text-[#F0DFB4] backdrop-blur-md"
                    >
                      {favoriteFeedback}
                    </motion.p>
                  ) : null}
                </AnimatePresence>
              </div>

              {/*
                Barra unica: as tres acoes moram no mesmo objeto, com a acao
                principal (guardar) destacada e a de saida discreta. Antes eram
                tres pilulas soltas de peso visual identico — o usuario tinha
                que ler as tres para achar a que queria.
              */}
              <div className="flex items-center gap-1 rounded-full border border-white/14 bg-black/55 p-1 shadow-[0_10px_34px_rgba(0,0,0,0.45)] backdrop-blur-xl">
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
                />

                <span className="mx-0.5 h-6 w-px bg-white/12" aria-hidden />

                <ControlButton
                  onClick={onClose}
                  icon={<X className="h-4 w-4" aria-hidden />}
                  label="Voltar"
                  compact
                />
              </div>

              <button
                type="button"
                onClick={onOpenFavorites}
                className="rounded-full px-3 py-1 text-[10px] font-semibold tracking-[0.18em] uppercase text-white/50 transition hover:bg-white/10 hover:text-white/90"
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
  compact = false,
  ariaPressed,
}: {
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  compact?: boolean;
  ariaPressed?: boolean;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.96 }}
      type="button"
      onClick={onClick}
      aria-pressed={ariaPressed}
      aria-label={label}
      className={`flex h-11 items-center gap-2 rounded-full px-4 text-[11px] font-bold tracking-[0.1em] uppercase transition ${
        active
          ? "bg-[#E6C978] text-[#241B08]"
          : compact
            ? "text-white/60 hover:bg-white/10 hover:text-white"
            : "text-white/85 hover:bg-white/12 hover:text-white"
      }`}
    >
      {icon}
      <span className={compact ? "hidden sm:inline" : ""}>{label}</span>
    </motion.button>
  );
}
