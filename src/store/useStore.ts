import { create } from 'zustand';
import type { EmotionData } from '../types';
import * as THREE from 'three';
import { detectDevice } from '../utils/deviceDetection';
import { RAW_MESSAGES } from '../data/messages';

const generateInitialEmotions = (): EmotionData[] => {
    const emotions: EmotionData[] = [];
    // Ensure we have 15 leaves
    for (let i = 0; i < 15; i++) {
        // Pick random message
        const msgIdx = Math.floor(Math.random() * RAW_MESSAGES.length);
        const msg = RAW_MESSAGES[msgIdx];

        // Pick random texture (1-5)
        const texIdx = Math.floor(Math.random() * 5) + 1;

        emotions.push({
            id: `init-${i}`,
            text: "Inspiração",
            reflection: msg.text, // Use message text as reflection/content
            color: '#FFFFFF', // Placeholder, will be tinted by texture group logic or unused if texture overrides
            category: 'alegria', // Default category
            subcategory: msg.author || 'Sabedoria',
            intensity: 3,
            tags: ['initial'],
            textureUrl: `/textures/leaves/leaf_tex_0${texIdx}.jpg`
        });
    }
    return emotions;
};

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
    activeTab: 'home' | 'gallery' | 'explore' | 'studio' | 'breathing';
    deviceInfo: ReturnType<typeof detectDevice>;

    setSeed: (seed: number) => void;
    regenerateSeed: () => void;
    setQuality: (quality: string) => void;
    setEmotions: (emotions: EmotionData[]) => void;
    setFocusedEmotion: (emotion: EmotionData | null) => void;
    setCinematic: (isCinematic: boolean) => void;
    setReduceMotion: (reduceMotion: boolean) => void;
    setWindLevel: (level: 'Off' | 'Calm' | 'Breezy') => void;
    setActiveTab: (tab: 'home' | 'gallery' | 'explore' | 'studio' | 'breathing') => void;
    togglePause: () => void;

    triggerCameraReset: () => void;

    // Cinematic Leaf Interaction
    focusedLeaf: FocusedLeafData | null;
    selectedMessage: MessageData | null;
    interactionLock: boolean;

    // AI & Studio
    studioProposal: any | null;
    isBreathing: boolean;

    setFocusedLeaf: (data: FocusedLeafData | null) => void;
    setSelectedMessage: (msg: MessageData | null) => void;
    setInteractionLock: (locked: boolean) => void;
    setStudioProposal: (proposal: any | null) => void;
    setIsBreathing: (isBreathing: boolean) => void;
}

// Initialize with device detection
const deviceInfo = detectDevice();

export const useStore = create<AppState>((set) => ({
    seed: 12345,
    quality: 'Low', // Default to Low (Safe Mode) - CRITICAL for stability
    emotions: generateInitialEmotions(), // Initialize with 15 leaves
    focusedEmotion: null,
    isCinematic: false,
    reduceMotion: true, // Default to true (Performance Mode On)
    windLevel: deviceInfo.isMobile ? 'Off' : 'Calm', // Disable wind on mobile by default
    isPaused: false,
    resetCameraTrigger: 0,
    activeTab: 'home',
    deviceInfo,

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
    studioProposal: null,
    isBreathing: false,

    setFocusedLeaf: (focusedLeaf) => set({ focusedLeaf }),
    setSelectedMessage: (selectedMessage) => set({ selectedMessage }),
    setInteractionLock: (interactionLock) => set({ interactionLock }),
    setStudioProposal: (studioProposal) => set({ studioProposal }),
    setIsBreathing: (isBreathing) => set({ isBreathing }),
}));
