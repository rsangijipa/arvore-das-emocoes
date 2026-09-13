"use client";

import { motion } from "motion/react";

import { TAP_CHIP, SPRING_FAST } from "@/lib/utils/spring";
import type { ThemeFilter, ThemeOption } from "@/types/quote";

type ThemeFilterProps = {
  themes: ThemeOption[];
  value: ThemeFilter;
  onChange: (theme: ThemeFilter) => void;
};

export function ThemeFilter({ themes, value, onChange }: ThemeFilterProps) {
  return (
    <div
      role="radiogroup"
      aria-label="Tema das mensagens"
      className="hud-scroller flex items-center gap-2 whitespace-nowrap pr-3 pb-1"
    >
      <FilterChip
        label="Todos"
        active={value === "all"}
        onClick={() => onChange("all")}
        color="#9FB4C8"
      />
      {themes.map((theme) => (
        <FilterChip
          key={theme.slug}
          label={theme.label}
          active={value === theme.slug}
          onClick={() => onChange(theme.slug)}
          color={theme.color}
        />
      ))}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
  color,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color: string;
}) {
  return (
    <motion.button
      {...(active ? {} : TAP_CHIP)}
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onClick}
      /*
       * h-9 (36 px) + padding vertical garante área de toque ≥ 44 px via
       * min-height herdado de button em globals.css.
       * px-4 em vez de px-3.5 dá mais espaço para o texto + ponto de cor.
       */
      layout
      transition={SPRING_FAST}
      className="relative flex h-9 shrink-0 items-center rounded-full px-4 text-[11.5px] font-semibold tracking-[0.06em]"
      style={{
        border: `1px solid ${active ? `${color}70` : "rgba(209, 220, 236, 0.14)"}`,
        background: active ? `${color}2E` : "rgba(255, 255, 255, 0.04)",
        color: active ? "#F8F4EA" : "#B6C4D6",
        boxShadow: active ? `0 0 0 1px ${color}22, 0 4px 14px ${color}20` : "none",
      }}
    >
      {/* ponto de cor: identifica o tema mesmo quando o chip esta inativo */}
      <motion.span
        aria-hidden
        animate={{ scale: active ? 1.3 : 1, opacity: active ? 1 : 0.5 }}
        transition={SPRING_FAST}
        className="mr-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full align-middle"
        style={{ background: color }}
      />
      {label}
    </motion.button>
  );
}
