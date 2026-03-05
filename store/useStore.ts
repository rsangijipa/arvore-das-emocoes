import { create } from 'zustand';
import { Quote } from '@/types/quote';

interface AppState {
  selectedQuote: Quote | null;
  hoveredLeafId: number | null;
  performanceMode: 'high' | 'medium' | 'safe';
  isPanelOpen: boolean;

  // Actions
  setSelectedQuote: (quote: Quote | null) => void;
  setHoveredLeafId: (id: number | null) => void;
  setPerformanceMode: (mode: 'high' | 'medium' | 'safe') => void;
  setPanelOpen: (isOpen: boolean) => void;
  pickRandomQuote: (quotes: Quote[]) => void;
}

export const useStore = create<AppState>((set) => ({
  selectedQuote: null,
  hoveredLeafId: null,
  performanceMode: 'high',
  isPanelOpen: false,

  setSelectedQuote: (quote) => set({ selectedQuote: quote, isPanelOpen: !!quote }),
  setHoveredLeafId: (id) => set({ hoveredLeafId: id }),
  setPerformanceMode: (mode) => set({ performanceMode: mode }),
  setPanelOpen: (isOpen) => set({ isPanelOpen: isOpen }),
  pickRandomQuote: (quotes) => {
    if (quotes.length === 0) return;
    const randomIndex = Math.floor(Math.random() * quotes.length);
    set({ selectedQuote: quotes[randomIndex], isPanelOpen: true });
  }
}));
