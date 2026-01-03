import { create } from 'zustand';
import type { EmotionData } from '../types';
import * as THREE from 'three';

export interface FocusedLeafData {
    id: string; // emotion id if available, or generated
    textureIndex: number;
    instanceId: number;
    matrix: THREE.Matrix4;
}

export interface MessageData {
    text: string;
    author?: string;
}

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
    activeTab: 'home' | 'gallery' | 'explore';

    setSeed: (seed: number) => void;
    regenerateSeed: () => void;
    setQuality: (quality: string) => void;
    setEmotions: (emotions: EmotionData[]) => void;
    setFocusedEmotion: (emotion: EmotionData | null) => void;
    setCinematic: (isCinematic: boolean) => void;
    setReduceMotion: (reduceMotion: boolean) => void;
    setWindLevel: (level: 'Off' | 'Calm' | 'Breezy') => void;
    setActiveTab: (tab: 'home' | 'gallery' | 'explore') => void;
    togglePause: () => void;

    triggerCameraReset: () => void;

    // Cinematic Leaf Interaction
    focusedLeaf: FocusedLeafData | null;
    selectedMessage: MessageData | null;
    interactionLock: boolean;

    setFocusedLeaf: (data: FocusedLeafData | null) => void;
    setSelectedMessage: (msg: MessageData | null) => void;
    setInteractionLock: (locked: boolean) => void;
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
    activeTab: 'home',

    setSeed: (seed) => set({ seed }),
    regenerateSeed: () => set({ seed: Math.random() * 10000 }),
    setQuality: (quality) => set({ quality }),
    setEmotions: (emotions) => set({ emotions }),
    setFocusedEmotion: (focusedEmotion) => set({ focusedEmotion }),
    setCinematic: (isCinematic) => set({ isCinematic }),
    setReduceMotion: (reduceMotion) => set({ reduceMotion }),
    setWindLevel: (windLevel) => set({ windLevel }),
    setActiveTab: (activeTab) => set({ activeTab }),
    togglePause: () => set((state) => ({ isPaused: !state.isPaused })),
    triggerCameraReset: () => set((state) => ({ resetCameraTrigger: state.resetCameraTrigger + 1 })),

    focusedLeaf: null,
    selectedMessage: null,
    interactionLock: false,

    setFocusedLeaf: (focusedLeaf) => set({ focusedLeaf }),
    setSelectedMessage: (selectedMessage) => set({ selectedMessage }),
    setInteractionLock: (interactionLock) => set({ interactionLock }),
}));
