"use client";

import { create } from "zustand";

import type { QualityProfile } from "@/types/performance";
import type { Quote, ThemeFilter, ThemeOption } from "@/types/quote";

type QuoteState = {
  sessionId: string;
  quotes: Quote[];
  themes: ThemeOption[];
  activeQuote: Quote | null;
  themeFilter: ThemeFilter;
  favorites: string[];
  panelOpen: boolean;
  qualityProfile: QualityProfile;
  setSessionId: (sessionId: string) => void;
  setQuotes: (quotes: Quote[]) => void;
  setThemes: (themes: ThemeOption[]) => void;
  setActiveQuote: (quote: Quote | null) => void;
  setThemeFilter: (theme: ThemeFilter) => void;
  setFavorites: (favorites: string[]) => void;
  toggleFavorite: (quoteId: string) => boolean;
  setPanelOpen: (panelOpen: boolean) => void;
  setQualityProfile: (qualityProfile: QualityProfile) => void;
};

export const useQuoteStore = create<QuoteState>((set, get) => ({
  sessionId: "",
  quotes: [],
  themes: [],
  activeQuote: null,
  themeFilter: "all",
  favorites: [],
  panelOpen: false,
  qualityProfile: "medium",
  setSessionId: (sessionId) => set({ sessionId }),
  setQuotes: (quotes) => set({ quotes }),
  setThemes: (themes) => set({ themes }),
  setActiveQuote: (activeQuote) => set({ activeQuote }),
  setThemeFilter: (themeFilter) => set({ themeFilter }),
  setFavorites: (favorites) => set({ favorites }),
  toggleFavorite: (quoteId) => {
    const favorites = get().favorites;
    const alreadyFavorite = favorites.includes(quoteId);
    const nextFavorites = alreadyFavorite
      ? favorites.filter((id) => id !== quoteId)
      : [...favorites, quoteId];

    set({ favorites: nextFavorites });
    return !alreadyFavorite;
  },
  setPanelOpen: (panelOpen) => set({ panelOpen }),
  setQualityProfile: (qualityProfile) => set({ qualityProfile }),
}));
