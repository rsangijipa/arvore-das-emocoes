"use client";

import { AnimatePresence, motion, useDragControls } from "motion/react";
import { Heart, Trash2, X } from "lucide-react";
import { useRef } from "react";

import { themeLabel } from "@/data/labels";
import type { Quote } from "@/types/quote";

type FavoritesDrawerProps = {
  open: boolean;
  quotes: Quote[];
  onClose: () => void;
  onSelect: (quote: Quote) => void;
  onRemove: (quoteId: string) => void;
};

export function FavoritesDrawer({ open, quotes, onClose, onSelect, onRemove }: FavoritesDrawerProps) {
  const dragControls = useDragControls();
  const sheetRef = useRef<HTMLElement>(null);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* backdrop em mobile: toque fora fecha */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-auto fixed inset-0 z-29 lg:hidden"
            aria-hidden
            onClick={onClose}
          />

          <motion.aside
            ref={sheetRef}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.3 }}
            onDragEnd={(_, info) => {
              /* fecha se arrastou > 80 px para baixo */
              if (info.offset.y > 80) onClose();
            }}
            initial={{ opacity: 0, y: 40, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 40, filter: "blur(6px)" }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="hud-card pointer-events-auto fixed inset-x-0 bottom-0 z-30 flex max-h-[72vh] flex-col rounded-t-[28px] rounded-b-none p-0 shadow-[0_-8px_40px_rgba(0,0,0,0.5)] lg:absolute lg:inset-x-auto lg:top-[152px] lg:right-6 lg:bottom-auto lg:w-[min(420px,calc(100vw-2rem))] lg:rounded-[20px] xl:top-[166px]"
            aria-label="Frases favoritas"
          >
            {/*
              Handle de drag: área de toque dedicada no topo do sheet.
              `onPointerDown` inicia o drag do framer-motion sem capturar
              eventos de scroll da lista abaixo.
            */}
            <div
              className="flex shrink-0 cursor-grab touch-none select-none flex-col items-center pb-2 pt-3 active:cursor-grabbing lg:hidden"
              onPointerDown={(e) => dragControls.start(e)}
              aria-hidden
            >
              <div className="h-1 w-12 rounded-full bg-white/22" />
            </div>

            {/* header — padding lateral generoso para dedos */}
            <div className="flex shrink-0 items-center justify-between px-5 pb-4 pt-1 lg:pt-4">
              <div className="flex items-center gap-2.5">
                <Heart className="h-4 w-4 shrink-0 text-[#F3D08A]" aria-hidden />
                <div>
                  <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-[#D5E1EF]">
                    Favoritas
                  </p>
                  <p className="text-[11px] text-[#AFC3D9]">Salvas neste dispositivo</p>
                </div>
              </div>

              {/* botão de fechar: 44×44 px mínimo */}
              <button
                type="button"
                onClick={onClose}
                className="hud-pill flex h-11 w-11 items-center justify-center text-[#DCE8F5] transition"
                aria-label="Fechar favoritas"
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <div className="hud-divider mx-5 shrink-0" />

            {/* lista com scroll independente do drag */}
            <div
              className="flex-1 space-y-2 overflow-y-auto overscroll-contain px-4 py-3"
              style={{ WebkitOverflowScrolling: "touch" } as React.CSSProperties}
              onPointerDown={(e) => e.stopPropagation()}
            >
              {quotes.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-white/12 bg-white/[0.04] px-4 py-6 text-sm leading-relaxed text-[#C7D8EA]">
                  Suas frases guardadas aparecerão aqui.
                </p>
              ) : (
                quotes.map((quote) => (
                  <div
                    key={quote.id}
                    className="group relative flex items-stretch gap-1"
                  >
                    <button
                      type="button"
                      onClick={() => onSelect(quote)}
                      className="hud-list-item min-w-0 flex-1 px-4 py-3.5 text-left"
                    >
                      <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-[#AFC3D9]">
                        {themeLabel(quote.theme)}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-[#F2F6FC]">{quote.text}</p>
                    </button>

                    {/*
                      Botão de remoção:
                      — sempre visível em touch (pointer: coarse) via @media
                      — aparece no hover em mouse (pointer: fine)
                      — alvo generoso: 44×44 px
                    */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemove(quote.id);
                      }}
                      aria-label={`Remover "${quote.text}" das favoritas`}
                      className="remove-btn shrink-0 self-center rounded-full p-3 text-[#6A8099] transition hover:bg-white/10 hover:text-[#D9B4A8] focus-visible:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                ))
              )}

              {/* espaço extra embaixo para o home indicator em iOS */}
              <div className="h-[env(safe-area-inset-bottom,0px)] lg:hidden" />
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
