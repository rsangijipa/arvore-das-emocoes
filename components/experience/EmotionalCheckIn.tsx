"use client";

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";

import { TAP_BUTTON, TAP_CHIP, SPRING_FAST } from "@/lib/utils/spring";
import type { Emotion } from "@/types/emotional-session";

type Props = { open: boolean; title: string; onComplete: (emotion: Emotion, intensity: number) => void; onSkip: () => void };

const OPTIONS: Array<{ id: Emotion; label: string; symbol: string; color: string }> = [
  { id: "calm", label: "Tranquilo", symbol: "~", color: "#9FCFCA" }, { id: "happy", label: "Feliz", symbol: "☀", color: "#F4D58D" },
  { id: "sad", label: "Triste", symbol: "◔", color: "#9DB4CE" }, { id: "irritated", label: "Irritado", symbol: "✦", color: "#D6A391" },
  { id: "worried", label: "Preocupado", symbol: "◌", color: "#B9ADD3" }, { id: "tired", label: "Cansado", symbol: "☾", color: "#8FA5AE" },
  { id: "overwhelmed", label: "Sobrecarregado", symbol: "≋", color: "#C6A4B7" }, { id: "unsure", label: "Não sei", symbol: "?", color: "#B8B8AE" },
];
const BODY_SIGNALS = ["Coração rápido", "Barriga apertada", "Vontade de chorar", "Mãos inquietas", "Corpo pesado", "Vontade de gritar", "Calor", "Tensão", "Não sei"];

export function EmotionalCheckIn({ open, title, onComplete, onSkip }: Props) {
  const [emotion, setEmotion] = useState<Emotion | null>(null);
  const [intensity, setIntensity] = useState(3);
  const [bodyExplorationDone, setBodyExplorationDone] = useState(false);
  const [bodySignals, setBodySignals] = useState<string[]>([]);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (open) dialogRef.current?.focus(); }, [open]);
  if (!open) return null;

  return <AnimatePresence><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-end justify-center bg-[#08111a]/70 p-4 backdrop-blur-sm sm:items-center" onMouseDown={(event) => { if (event.target === event.currentTarget) onSkip(); }}>
    <motion.div ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="emotion-title" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="hud-panel w-full max-w-xl p-5 outline-none sm:p-7">
      <p className="text-[10px] font-semibold tracking-[.22em] uppercase text-[#A8C4C6]">Um momento com você</p>
      <h2 id="emotion-title" className="mt-2 font-[family-name:var(--font-display)] text-2xl text-[#F1F0E9]">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-[#C7D6E6]">Escolha uma palavra, um símbolo ou uma cor. Você pode pular esta parte.</p>
      <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">{OPTIONS.map((option) => <motion.button key={option.id} {...(emotion !== option.id ? TAP_BUTTON : {})} type="button" onClick={() => { setEmotion(option.id); setBodyExplorationDone(option.id !== "unsure"); }} aria-pressed={emotion === option.id} className={`min-h-16 rounded-2xl border p-2 text-left ${emotion === option.id ? "border-[#F0CF8E] bg-white/14" : "border-white/10 bg-white/[.045]"}`}><motion.span animate={emotion === option.id ? { scale: 1.25 } : { scale: 1 }} transition={SPRING_FAST} aria-hidden className="text-xl" style={{ color: option.color }}>{option.symbol}</motion.span><span className="mt-1 block text-xs text-[#E7EEF7]">{option.label}</span></motion.button>)}</div>
      {emotion === "unsure" && !bodyExplorationDone ? <div className="mt-5 rounded-2xl border border-white/10 bg-white/[.045] p-4"><p className="text-sm text-[#E7EEF7]">O que você percebe no seu corpo?</p><div className="mt-3 flex flex-wrap gap-2">{BODY_SIGNALS.map((signal) => <motion.button key={signal} {...TAP_CHIP} type="button" onClick={() => setBodySignals((current) => current.includes(signal) ? current.filter((item) => item !== signal) : [...current, signal])} aria-pressed={bodySignals.includes(signal)} className={`min-h-10 rounded-full border px-3 text-xs ${bodySignals.includes(signal) ? "border-[#F0CF8E] bg-white/14 text-white" : "border-white/10 text-[#C7D6E6]"}`}>{signal}</motion.button>)}</div><p className="mt-3 text-xs leading-relaxed text-[#B8CAD8]">Esses sinais podem aparecer junto da preocupação, irritação ou cansaço. Só você pode dizer o que combina mais com este momento.</p><motion.button {...TAP_BUTTON} type="button" onClick={() => setBodyExplorationDone(true)} className="hud-btn-secondary mt-3 px-4 text-xs">Continuar</motion.button></div> : null}
      {emotion && bodyExplorationDone ? <div className="mt-5"><p className="text-sm text-[#E7EEF7]">Quanto isso está grande agora?</p><div className="mt-3 flex items-end justify-between gap-2" role="group" aria-label="Intensidade de um a cinco">{[1,2,3,4,5].map((value) => <motion.button key={value} {...TAP_BUTTON} type="button" onClick={() => setIntensity(value)} aria-pressed={intensity === value} aria-label={`Intensidade ${value} de 5`} className="flex min-h-12 flex-1 items-end justify-center rounded-xl border border-white/10 bg-white/[.045] pb-2"><motion.span layout animate={{ height: `${12 + value * 6}px`, background: value <= intensity ? "#E8C77A" : "rgba(255,255,255,.18)" }} transition={SPRING_FAST} className="w-5 rounded-full" /></motion.button>)}</div></div> : null}
      <div className="mt-6 flex items-center justify-between gap-3"><motion.button {...TAP_BUTTON} type="button" onClick={onSkip} className="min-h-11 px-2 text-sm text-[#B8CAD8] underline underline-offset-4">Agora não</motion.button><motion.button {...(emotion && bodyExplorationDone ? TAP_BUTTON : {})} type="button" disabled={!emotion || !bodyExplorationDone} onClick={() => emotion && onComplete(emotion, intensity)} className="hud-btn-primary px-5 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-40">Entrar na floresta</motion.button></div>
    </motion.div>
  </motion.div></AnimatePresence>;
}
