"use client";

import { AnimatePresence, motion } from "motion/react";
import { Heart, Shuffle, X } from "lucide-react";

import { QuoteMessageContent } from "@/components/ui/QuoteMessageContent";
import type { Quote } from "@/types/quote";

type QuotePanelProps = {
  quote: Quote | null;
  panelOpen: boolean;
  themeLabel: string;
  isFavorite: boolean;
  favoriteCount: number;
  favoriteFeedback: string | null;
  onClose: () => void;
  onRandom: () => void;
  onFavorite: () => void;
  onBackToTree: () => void;
  onOpenFavorites: () => void;
};

export function QuotePanel({
  quote,
  panelOpen,
  themeLabel,
  isFavorite,
  favoriteCount,
  favoriteFeedback,
  onClose,
  onRandom,
  onFavorite,
  onBackToTree,
  onOpenFavorites,
}: QuotePanelProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 hidden items-center justify-center p-6 lg:flex">
      <AnimatePresence mode="wait">
        {panelOpen && quote && (
          <motion.div
            key={quote.id}
            initial={{ opacity: 0, scale: 0.95, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.95, filter: "blur(8px)" }}
            transition={{ type: "spring", stiffness: 100, damping: 20, delay: 0.2 }}
            className="hud-card pointer-events-auto relative w-full max-w-2xl rounded-[32px] border border-white/10 bg-[#0A121A]/40 p-10 text-center shadow-[0_40px_80px_rgba(0,0,0,0.6)]"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute top-6 right-6 flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-white/60 transition hover:bg-white/10 hover:text-white"
              aria-label="Fechar painel"
            >
              <X className="h-4 w-4" />
            </button>

            <QuoteMessageContent
              quote={quote}
              themeLabel={themeLabel}
              favoriteFeedback={favoriteFeedback}
              eyebrow="Mensagem Encontrada"
            />

            <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={onFavorite}
                className={`flex h-12 items-center gap-2 rounded-full border px-6 text-[11px] font-bold tracking-[0.1em] uppercase transition ${
                  isFavorite
                    ? "border-[#E6C978] bg-[#E6C978]/20 text-[#FFF4D6]"
                    : "border-white/20 bg-white/5 text-white/80 hover:bg-white/10"
                }`}
              >
                <Heart className={`h-4 w-4 ${isFavorite ? "fill-[#E6C978]" : ""}`} />
                {isFavorite ? "Guardado" : "Guardar"}
              </button>

              <button
                type="button"
                onClick={onBackToTree}
                className="flex h-12 items-center rounded-full border border-white/10 bg-transparent px-6 text-[11px] font-bold tracking-[0.1em] uppercase text-white/80 transition hover:bg-white/5"
              >
                Voltar a respirar
              </button>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <button
                type="button"
                onClick={onRandom}
                className="flex h-10 items-center gap-2 rounded-full border border-[#9EC6BA]/30 bg-[#9EC6BA]/10 px-4 text-[10px] font-semibold tracking-[0.1em] uppercase text-[#E7F2EE] transition hover:bg-[#9EC6BA]/20"
              >
                <Shuffle className="h-3.5 w-3.5" />
                Outra mensagem
              </button>

              <button
                type="button"
                onClick={onOpenFavorites}
                className="flex h-10 items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 text-[10px] font-semibold tracking-[0.1em] uppercase text-white/80 transition hover:bg-white/10"
              >
                <Heart className="h-3.5 w-3.5" />
                Favoritas ({favoriteCount})
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
