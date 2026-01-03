import { create } from 'zustand';
import type { EmotionData } from '../types';

interface AppState {
    seed: number;
    quality: string;
    emotions: EmotionData[];
    focusedEmotion: EmotionData | null;
    isCinematic: boolean;
    reduceMotion: boolean;
    windLevel: 'Off' | 'Calm' | 'Breezy';
    isPaused: boolean;
    resetCameraTrigger: number;

    setSeed: (seed: number) => void;
    regenerateSeed: () => void;
    setQuality: (quality: string) => void;
    setEmotions: (emotions: EmotionData[]) => void;
    setFocusedEmotion: (emotion: EmotionData | null) => void;
    setCinematic: (isCinematic: boolean) => void;
    setReduceMotion: (reduceMotion: boolean) => void;
    setWindLevel: (level: 'Off' | 'Calm' | 'Breezy') => void;
    togglePause: () => void;
    triggerCameraReset: () => void;
}

export const useStore = create<AppState>((set) => ({
    seed: 12345,
    quality: 'Balanced',
    emotions: [],
    focusedEmotion: null,
    isCinematic: false,
    reduceMotion: false,
    windLevel: 'Calm',
    isPaused: false,
    resetCameraTrigger: 0,

    setSeed: (seed) => set({ seed }),
    regenerateSeed: () => set({ seed: Math.random() * 10000 }),
    setQuality: (quality) => set({ quality }),
    setEmotions: (emotions) => set({ emotions }),
    setFocusedEmotion: (focusedEmotion) => set({ focusedEmotion }),
    setCinematic: (isCinematic) => set({ isCinematic }),
    setReduceMotion: (reduceMotion) => set({ reduceMotion }),
    setWindLevel: (windLevel) => set({ windLevel }),
    togglePause: () => set((state) => ({ isPaused: !state.isPaused })),
    triggerCameraReset: () => set((state) => ({ resetCameraTrigger: state.resetCameraTrigger + 1 })),
}));
