/**
 * Level of Detail (LOD) utilities
 * Reduces geometry complexity based on camera distance
 */

import * as THREE from 'three';
import { useStore } from '../store/useStore';

export interface LODConfig {
    highDetailDistance: number;  // Use high detail within this distance
    mediumDetailDistance: number; // Use medium detail within this distance
    lowDetailDistance: number;    // Use low detail beyond this
}

export const DEFAULT_LOD_CONFIG: LODConfig = {
    highDetailDistance: 50,
    mediumDetailDistance: 80,
    lowDetailDistance: 120,
};

export const MOBILE_LOD_CONFIG: LODConfig = {
    highDetailDistance: 30,
    mediumDetailDistance: 60,
    lowDetailDistance: 90,
};

/**
 * Get LOD level based on distance from camera
 */
export const getLODLevel = (
    position: THREE.Vector3,
    camera: THREE.Camera,
    config: LODConfig = DEFAULT_LOD_CONFIG
): 'high' | 'medium' | 'low' => {
    const distance = camera.position.distanceTo(position);
    
    if (distance < config.highDetailDistance) return 'high';
    if (distance < config.mediumDetailDistance) return 'medium';
    return 'low';
};

/**
 * Get geometry segments based on LOD level
 */
export const getLODSegments = (level: 'high' | 'medium' | 'low', baseSegments: number): number => {
    switch (level) {
        case 'high':
            return baseSegments;
        case 'medium':
            return Math.max(2, Math.floor(baseSegments * 0.6));
        case 'low':
            return Math.max(2, Math.floor(baseSegments * 0.4));
    }
};

/**
 * Hook to get LOD config based on device
 */
export const useLODConfig = (): LODConfig => {
    const deviceInfo = useStore(state => state.deviceInfo);
    return deviceInfo.isMobile ? MOBILE_LOD_CONFIG : DEFAULT_LOD_CONFIG;
};

