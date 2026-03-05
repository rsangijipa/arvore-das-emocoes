"use client";

import { AnimatePresence, motion } from "motion/react";
import { Heart, Shuffle, X } from "lucide-react";

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
    <div className="pointer-events-none absolute top-[152px] right-6 z-30 hidden w-[min(380px,calc(100vw-3rem))] lg:block xl:top-[166px]">
      <AnimatePresence mode="wait">
        {panelOpen && (
          <motion.div
            key={quote?.id ?? "empty-state"}
            initial={{ opacity: 0, x: 20, filter: "blur(10px)" }}
            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, x: 14, filter: "blur(8px)" }}
            transition={{ type: "spring", stiffness: 190, damping: 26, mass: 0.8 }}
            className="hud-card pointer-events-auto rounded-[24px] p-6 shadow-[0_30px_70px_rgba(0,0,0,0.46)]"
          >
            <div className="mb-4 flex items-start justify-between">
              <div>
                <p className="text-[10px] tracking-[0.2em] uppercase text-[#DCA269]">Mensagem do momento</p>
                <p className="mt-1 text-[11px] text-[#E8DCC8]/80">{themeLabel}</p>
              </div>

                <button
                  type="button"
                  onClick={onClose}
                  className="hud-pill flex h-8 w-8 items-center justify-center transition"
                  aria-label="Fechar painel"
                >
                <X className="h-4 w-4 text-[#F0E5D4]" />
              </button>
            </div>

            {quote ? (
              <>
                <p className="font-[family-name:var(--font-display)] text-[1.52rem] leading-[1.38] text-[#F8F2E9]">
                  {quote.text}
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <Tag label={`Tema: ${quote.theme}`} />
                  <Tag label={`Tom: ${quote.tone}`} />
                  {quote.author ? <Tag label={`Autor: ${quote.author}`} /> : null}
                </div>

                <div className="mt-3 min-h-5 text-[11px] text-[#DBCBB1]" aria-live="polite">
                  {favoriteFeedback}
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={onFavorite}
                    className={`h-10 rounded-2xl border px-3 text-[11px] font-semibold tracking-[0.1em] uppercase transition ${isFavorite
                        ? "border-[#E6C978]/65 bg-[rgba(230,201,120,0.25)] text-[#FFF4D6]"
                        : "border-[#E6C978]/35 bg-[rgba(230,201,120,0.08)] text-[#FFF2CE]/80 hover:bg-[rgba(230,201,120,0.16)]"
                      }`}
                  >
                    {isFavorite ? "Salvo" : "Salvar"}
                  </button>

                  <button
                    type="button"
                    onClick={onRandom}
                    className="h-10 rounded-2xl border border-[#9EC6BA]/35 bg-[rgba(132,181,169,0.14)] px-3 text-[11px] font-semibold tracking-[0.1em] uppercase text-[#E7F2EE] transition hover:bg-[rgba(132,181,169,0.22)]"
                  >
                    Outra mensagem
                  </button>

                  <button
                    type="button"
                    onClick={onOpenFavorites}
                    className="hud-pill flex h-10 items-center justify-center gap-2 rounded-2xl px-3 text-[11px] font-semibold tracking-[0.1em] uppercase transition"
                  >
                    <Heart className="h-3.5 w-3.5" />
                    Favoritas ({favoriteCount})
                  </button>

                  <button
                    type="button"
                    onClick={onBackToTree}
                    className="hud-btn-ghost h-10 rounded-2xl px-3 text-[11px] font-semibold tracking-[0.1em] uppercase transition"
                  >
                    Voltar a arvore
                  </button>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/14 bg-white/[0.04] px-4 py-5">
                <p className="font-[family-name:var(--font-display)] text-2xl leading-tight text-[#F5EDDE]">
                  Escolha uma folha ou receba uma mensagem.
                </p>
                <button
                  type="button"
                  onClick={onRandom}
                  className="mt-5 flex items-center gap-2 rounded-2xl border border-[#9EC6BA]/35 bg-[rgba(132,181,169,0.14)] px-4 py-2.5 text-[11px] font-semibold tracking-[0.12em] uppercase text-[#E7F2EE] transition hover:bg-[rgba(132,181,169,0.24)]"
                >
                  <Shuffle className="h-3.5 w-3.5" />
                  Sortear frase
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Tag({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-[rgba(240,225,200,0.1)] bg-[rgba(240,225,200,0.04)] px-2.5 py-1.5 text-[10px] tracking-[0.14em] uppercase text-[#E8DCC8]">
      {label}
    </span>
  );
}
