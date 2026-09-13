"use client";

import { AnimatePresence, motion } from "motion/react";
import { Pause, Play, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { TAP_BUTTON } from "@/lib/utils/spring";

type Props = { open: boolean; reduceMotion: boolean; onComplete: (durationMs: number) => void; onClose: () => void; onStart: () => void };

const CYCLE_MS = 10_000;

export function BreathingLeaf({ open, reduceMotion, onComplete, onClose, onStart }: Props) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    const interval = window.setInterval(() => setElapsed(performance.now() - (startedAt.current ?? performance.now())), 200);
    return () => window.clearInterval(interval);
  }, [running]);

  const finish = () => {
    const durationMs = Math.round(elapsed);
    if (durationMs > 4_000) onComplete(durationMs);
    setRunning(false);
    setElapsed(0);
    startedAt.current = null;
    onClose();
  };
  const toggle = () => {
    if (!running) { startedAt.current = performance.now() - elapsed; onStart(); }
    setRunning((current) => !current);
  };
  const phase = elapsed % CYCLE_MS;
  const inhale = phase < 4_000;
  const label = inhale ? "Inspire devagar" : "Expire com calma";

  return <AnimatePresence>{open ? <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-[#071018]/75 p-4 backdrop-blur-sm">
    <section role="dialog" aria-modal="true" aria-labelledby="breathing-title" className="hud-panel w-full max-w-md p-6 text-center">
      <motion.button {...TAP_BUTTON} type="button" onClick={finish} aria-label="Fechar respiração" className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full text-[#B8CAD8] hover:bg-white/10"><X aria-hidden className="h-4 w-4" /></motion.button>
      <p className="text-[10px] font-semibold tracking-[.22em] uppercase text-[#A8C4C6]">Folha de respiração</p>
      <h2 id="breathing-title" className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[#F1F0E9]">Respire com a folha</h2>
      <p className="mt-2 text-sm text-[#C7D6E6]">Acompanhe o movimento do seu jeito. Não precisa prender o ar.</p>
      <div className="my-8 flex h-40 items-center justify-center" aria-live="polite"><motion.div animate={running && !reduceMotion ? { scale: inhale ? 1.32 : 0.78, rotate: inhale ? 4 : -4 } : { scale: 1, rotate: 0 }} transition={{ duration: running ? (inhale ? 4 : 6) : 0.2, ease: "easeInOut" }} className="flex h-24 w-16 items-center justify-center rounded-[100%_0_100%_0] bg-[#B7D88D] text-xs font-semibold text-[#19301B] shadow-[0_0_45px_rgba(183,216,141,.28)]">{running ? label : "Pronto"}</motion.div></div>
      <p className="min-h-5 text-sm text-[#E7EEF7]">{running ? label : "Quando quiser, comece."}</p>
      <div className="mt-6 flex justify-center gap-3"><motion.button {...TAP_BUTTON} type="button" onClick={toggle} className="hud-btn-primary inline-flex items-center gap-2 px-5 text-sm font-semibold">{running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}{running ? "Pausar" : "Começar"}</motion.button><motion.button {...TAP_BUTTON} type="button" onClick={finish} className="hud-btn-secondary px-5 text-sm">Concluir</motion.button></div>
    </section>
  </motion.div> : null}</AnimatePresence>;
}
