"use client";

import { AnimatePresence, motion } from "motion/react";
import { Heart, Shuffle } from "lucide-react";

import type { Quote } from "@/types/quote";

type MobileQuoteSheetProps = {
  quote: Quote | null;
  panelOpen: boolean;
  themeLabel: string;
  isFavorite: boolean;
  favoriteCount: number;
  favoriteFeedback: string | null;
  onFavorite: () => void;
  onRandom: () => void;
  onClose: () => void;
  onBackToTree: () => void;
  onOpenFavorites: () => void;
};

export function MobileQuoteSheet({
  quote,
  panelOpen,
  themeLabel,
  isFavorite,
  favoriteCount,
  favoriteFeedback,
  onFavorite,
  onRandom,
  onClose,
  onBackToTree,
  onOpenFavorites,
}: MobileQuoteSheetProps) {
  return (
    <div className="pointer-events-none fixed right-0 bottom-0 left-0 z-30 lg:hidden">
      <AnimatePresence mode="wait">
        {panelOpen && (
          <motion.div
            key={quote?.id ?? "mobile-empty"}
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.18}
            onDragEnd={(_, info) => {
              if (info.offset.y > 80) {
                onClose();
              }
            }}
            className="hud-sheet pointer-events-auto rounded-t-[30px] border-t px-5 pt-4 pb-[calc(1.75rem+env(safe-area-inset-bottom))] shadow-[0_-24px_70px_rgba(0,0,0,0.62)]"
          >
            <div className="mx-auto mb-4 h-1 w-12 rounded-full bg-white/22" />

            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] tracking-[0.18em] uppercase text-[#DCA269]">Mensagem do momento</p>
                <p className="text-[11px] text-[#E8DCC8]/80">{themeLabel}</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="hud-pill h-8 px-3 text-[10px] tracking-[0.12em] uppercase"
              >
                Fechar
              </button>
            </div>

            {quote ? (
              <>
                <p className="font-[family-name:var(--font-display)] text-[1.35rem] leading-[1.45] text-[#F8F2E9]">
                  {quote.text}
                </p>

                <div className="mt-4 flex flex-wrap gap-2">
                  <Tag label={quote.theme} />
                  <Tag label={quote.tone} />
                </div>

                <div className="mt-3 min-h-5 text-[11px] text-[#DBCBB1]" aria-live="polite">
                  {favoriteFeedback}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={onFavorite}
                    className={`h-11 rounded-2xl border px-4 text-[11px] font-semibold tracking-[0.1em] uppercase transition ${isFavorite
                        ? "border-[#E6C978]/65 bg-[rgba(230,201,120,0.25)] text-[#FFF4D6]"
                        : "border-[#E6C978]/35 bg-[rgba(230,201,120,0.08)] text-[#FFF2CE]/80"
                      }`}
                  >
                    {isFavorite ? "Salvo" : "Salvar"}
                  </button>

                  <button
                    type="button"
                    onClick={onRandom}
                    className="flex h-11 items-center justify-center gap-2 rounded-2xl border border-[#9EC6BA]/35 bg-[rgba(132,181,169,0.14)] px-4 text-[11px] font-semibold tracking-[0.1em] uppercase text-[#E7F2EE]"
                  >
                    <Shuffle className="h-3.5 w-3.5" />
                    Outra
                  </button>

                  <button
                    type="button"
                    onClick={onOpenFavorites}
                    className="hud-pill flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-[11px] font-semibold tracking-[0.1em] uppercase"
                  >
                    <Heart className="h-3.5 w-3.5" />
                    Favoritas ({favoriteCount})
                  </button>

                  <button
                    type="button"
                    onClick={onBackToTree}
                    className="hud-btn-ghost h-11 rounded-2xl px-4 text-[11px] font-semibold tracking-[0.1em] uppercase"
                  >
                    Voltar
                  </button>
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-[rgba(240,225,200,0.12)] bg-white/[0.03] px-4 py-4">
                <p className="font-[family-name:var(--font-display)] text-[1.35rem] leading-tight text-[#F5EDDE]">
                  Escolha uma folha ou receba uma mensagem.
                </p>
                <button
                  type="button"
                  onClick={onRandom}
                  className="mt-4 h-11 w-full rounded-2xl border border-[#9EC6BA]/35 bg-[rgba(132,181,169,0.14)] px-4 text-[11px] font-semibold tracking-[0.1em] uppercase text-[#E7F2EE]"
                >
                  Receber frase
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
    <span className="rounded-full border border-[rgba(240,225,200,0.1)] bg-[rgba(240,225,200,0.04)] px-3 py-1.5 text-[10px] tracking-[0.15em] uppercase text-[#E8DCC8]">
      {label}
    </span>
  );
}
