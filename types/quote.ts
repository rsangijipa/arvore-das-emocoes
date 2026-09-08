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

/** acoes de telemetria aceitas pela API — usada como allowlist no servidor */
export const INTERACTION_ACTIONS = ["click", "favorite", "random", "theme_filter", "session_started", "emotion_checkin_started", "emotion_selected", "intensity_selected", "leaf_opened", "regulation_started", "regulation_completed", "regulation_abandoned", "emotion_checkout", "session_completed"] as const;

export type InteractionAction = (typeof INTERACTION_ACTIONS)[number];

export type InteractionPayload = {
  sessionId: string;
  actionType: InteractionAction;
  quoteId?: string;
  theme?: ThemeFilter;
  emotion?: string;
  intensity?: number;
  activityType?: string;
  durationMs?: number;
};

export type FavoritePayload = {
  sessionId: string;
  quoteId: string;
  isFavorite: boolean;
};
