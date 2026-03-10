"use client";

type QuoteTagProps = {
  label: string;
  compact?: boolean;
};

export function QuoteTag({ label, compact = false }: QuoteTagProps) {
  return (
    <span
      className={`rounded-full border bg-white/5 tracking-[0.15em] uppercase text-[#E8DCC8] ${
        compact
          ? "border-[rgba(240,225,200,0.1)] px-3 py-1.5 text-[10px]"
          : "border-white/10 px-4 py-1.5 text-[10px]"
      }`}
    >
      {label}
    </span>
  );
}
