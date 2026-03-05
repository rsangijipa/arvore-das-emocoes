export const THEME_SLUGS = [
  "calma",
  "esperanca",
  "recomeco",
  "forca",
  "foco",
  "autocuidado",
] as const;

export const TONES = [
  "acolhedor",
  "energizante",
  "contemplativo",
  "encorajador",
  "poetico",
  "terapeutico",
] as const;

export type ThemeSlug = (typeof THEME_SLUGS)[number];
export type Tone = (typeof TONES)[number];
export type ThemeFilter = ThemeSlug | "all";

export type Quote = {
  id: string;
  text: string;
  theme: ThemeSlug;
  tone: Tone;
  author?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type ThemeOption = {
  slug: ThemeSlug;
  label: string;
  color: string;
};

export type InteractionAction = "hover" | "click" | "favorite" | "random" | "theme_filter";

export type InteractionPayload = {
  sessionId: string;
  actionType: InteractionAction;
  quoteId?: string;
  theme?: ThemeFilter;
};

export type FavoritePayload = {
  sessionId: string;
  quoteId: string;
  isFavorite: boolean;
};
