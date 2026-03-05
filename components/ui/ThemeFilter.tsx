"use client";

import { motion } from "motion/react";

import type { ThemeFilter, ThemeOption } from "@/types/quote";

type ThemeFilterProps = {
  themes: ThemeOption[];
  value: ThemeFilter;
  onChange: (theme: ThemeFilter) => void;
};

export function ThemeFilter({ themes, value, onChange }: ThemeFilterProps) {
  return (
    <div className="flex w-full items-center gap-2 sm:gap-3">
      <span className="shrink-0 text-[10px] tracking-[0.18em] uppercase text-white/55">Tema</span>
      <div className="flex flex-1 items-center gap-2 overflow-x-auto whitespace-nowrap pr-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
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
      whileTap={{ scale: 0.98 }}
      whileHover={{ y: -1 }}
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`hud-pill h-9 shrink-0 px-4 text-[10px] font-semibold tracking-[0.14em] uppercase transition sm:text-[11px] ${active
        ? "shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
        : "hover:bg-white/5"
        }`}
      style={{
        borderColor: active ? `${color}60` : "rgba(209, 220, 236, 0.15)",
        background: active ? `${color}25` : "rgba(22, 31, 46, 0.4)",
        color: active ? "#F8F4EA" : "#C4D0E0",
      }}
    >
      {label}
    </motion.button>
  );
}
