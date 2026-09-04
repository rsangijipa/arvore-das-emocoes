import { THEMES } from "@/data/themes";
import type { ThemeSlug, Tone } from "@/types/quote";

/**
 * Rotulos legiveis para os slugs do catalogo.
 *
 * Varias telas mostravam o slug cru ("autocuidado", "poetico") direto na
 * interface. Centralizar aqui evita que a proxima tela repita o erro.
 */
const TONE_LABELS: Record<Tone, string> = {
  acolhedor: "Acolhedor",
  energizante: "Energizante",
  contemplativo: "Contemplativo",
  encorajador: "Encorajador",
  poetico: "Poético",
  terapeutico: "Terapêutico",
};

export function themeLabel(slug: ThemeSlug | string): string {
  return THEMES.find((theme) => theme.slug === slug)?.label ?? String(slug);
}

export function toneLabel(tone: Tone | string): string {
  return TONE_LABELS[tone as Tone] ?? String(tone);
}
