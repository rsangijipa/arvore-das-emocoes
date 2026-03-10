"use client";

import { AnimatePresence, motion } from "motion/react";
import { Heart, X } from "lucide-react";

import type { Quote } from "@/types/quote";

type FavoritesDrawerProps = {
  open: boolean;
  quotes: Quote[];
  onClose: () => void;
  onSelect: (quote: Quote) => void;
};

export function FavoritesDrawer({ open, quotes, onClose, onSelect }: FavoritesDrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ opacity: 0, y: 14, filter: "blur(6px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, y: 10, filter: "blur(6px)" }}
          transition={{ duration: 0.35, ease: "easeOut" }}
          className="hud-card pointer-events-auto fixed inset-x-4 right-4 bottom-4 z-30 max-h-[62vh] rounded-[24px] p-4 shadow-[0_24px_60px_rgba(0,0,0,0.45)] lg:absolute lg:top-[152px] lg:right-6 lg:bottom-auto lg:w-[min(420px,calc(100vw-2rem))] xl:top-[166px]"
          aria-label="Frases favoritas"
        >
          <div className="mx-auto mb-3 h-1 w-12 rounded-full bg-white/18 lg:hidden" />

          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-4 w-4 text-[#F3D08A]" />
              <div>
                <p className="text-[11px] tracking-[0.18em] uppercase text-[#D5E1EF]">Favoritas</p>
                <p className="text-[11px] text-[#AFC3D9]">Salvas nesta sessao</p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="hud-pill flex h-8 w-8 items-center justify-center text-[#DCE8F5] transition"
              aria-label="Fechar favoritas"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[48vh] space-y-2 overflow-y-auto pr-1">
            {quotes.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/12 bg-white/[0.04] px-4 py-5 text-sm text-[#C7D8EA]">
                Suas frases salvas aparecerao aqui.
              </p>
            ) : (
              quotes.map((quote) => (
                <button
                  key={quote.id}
                  type="button"
                  onClick={() => onSelect(quote)}
                  className="hud-list-item w-full px-4 py-3 text-left transition"
                >
                  <p className="text-[10px] tracking-[0.18em] uppercase text-[#AFC3D9]">{quote.theme}</p>
                  <p className="mt-1 text-sm leading-relaxed text-[#F2F6FC]">{quote.text}</p>
                </button>
              ))
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
