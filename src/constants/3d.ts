// Centralized constants for 3D configuration
// Benefits: Easier tuning, single source of truth, cleaner components

export const TREE_CONSTANTS = {
    BRANCH: {
        RADIUS_TOP: 0.35, // Tapered (0.7 * Bottom)
        RADIUS_BOTTOM: 0.5,
        HEIGHT: 1,
        SEGMENTS_MOBILE: 8,
        SEGMENTS_DESKTOP: 12,
        COLOR: '#2d241c',
        ROUGHNESS: 0.9
    },
    LEAF: {
        WIDTH: 1,
        HEIGHT: 1,
        SEGMENTS: 1, // Plane
        COLOR_SIMPLE: '#2d4a1e',
        COLOR_MESSAGE: '#fffdf0',
        ROUGHNESS_SIMPLE: 0.7,
        ROUGHNESS_MESSAGE: 0.8,
        MESSAGE_SCALE_FACTOR: 1.3
    },
    WIND: {
        OFF: { speed: 0.0, strength: 0.0 },
        CALM: { speed: 0.8, strength: 0.08 },
        BREEZY: { speed: 1.5, strength: 0.15 },
        TURBULENCE: 0.5
    },
    LOD: {
        DISTANCE_CUTOFF_MOBILE: 60,
        DISTANCE_CUTOFF_DESKTOP: 100
    }
};

export const SCENE_CONSTANTS = {
    BACKGROUND: {
        COLOR: '#22190c',
    },
    FOG: {
        COLOR: '#22190c',
        NEAR: 40,
        FAR: 150
    },
    LIGHTS: {
        DIRECTIONAL: {
            COLOR: '#e9ce98',
            INTENSITY: 1.8, // Slightly higher to reduce darkness
            POSITION: [20, 50, 20] as [number, number, number],
            SHADOW_MAP_SIZE_DESKTOP: 2048,
            SHADOW_MAP_SIZE_MOBILE: 1024
        },
        HEMISPHERE: {
            SKY_COLOR: '#cea86c',
            GROUND_COLOR: '#4a3b2a', // Lighter ground color to fill shadows
            INTENSITY: 0.6 // Boosted ambient
        }
    }
};

export const HERO_LEAF_CONSTANTS = {
    WIDTH: 1.2,
    HEIGHT: 1.6,
    ANIMATION_DURATION: 1.8,
    DISTANCE_FROM_CAMERA: 1.8
};
