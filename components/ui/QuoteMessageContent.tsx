"use client";

import { QuoteTag } from "@/components/ui/QuoteTag";
import type { Quote } from "@/types/quote";

type QuoteMessageContentProps = {
  quote: Quote;
  themeLabel: string;
  favoriteFeedback: string | null;
  eyebrow: string;
  compact?: boolean;
};

export function QuoteMessageContent({
  quote,
  themeLabel,
  favoriteFeedback,
  eyebrow,
  compact = false,
}: QuoteMessageContentProps) {
  return (
    <>
      <p className={`font-bold uppercase text-[#DCA269] ${compact ? "text-[10px] tracking-[0.18em]" : "mb-2 text-[10px] tracking-[0.25em]"}`}>
        {eyebrow}
      </p>
      <p className={`${compact ? "text-[11px]" : "mb-6 text-[11px]"} text-[#E8DCC8]/80`}>{themeLabel}</p>

      <h2
        className={`font-[family-name:var(--font-display)] text-[#F8F2E9] ${
          compact ? "mt-3 text-[1.35rem] leading-[1.45]" : "text-3xl leading-[1.3] drop-shadow-lg sm:text-4xl lg:text-5xl"
        }`}
      >
        {compact ? quote.text : `\"${quote.text}\"`}
      </h2>

      <div className={`flex flex-wrap gap-2 ${compact ? "mt-4" : "mt-8 items-center justify-center"}`}>
        <QuoteTag label={compact ? quote.theme : `Tema: ${quote.theme}`} compact={compact} />
        <QuoteTag label={compact ? quote.tone : `Tom: ${quote.tone}`} compact={compact} />
        {quote.author ? <QuoteTag label={compact ? `Autor: ${quote.author}` : `Autor: ${quote.author}`} compact={compact} /> : null}
      </div>

      <div className={`${compact ? "mt-3 min-h-5 text-[11px] text-[#DBCBB1]" : "mt-4 min-h-[24px] text-xs text-[#E6C978]/80"}`} aria-live="polite">
        {favoriteFeedback}
      </div>
    </>
  );
}
