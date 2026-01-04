/**
 * Device detection utilities for performance optimization
 */

export interface DeviceInfo {
    isMobile: boolean;
    isTablet: boolean;
    isDesktop: boolean;
    isLowEnd: boolean;
    pixelRatio: number;
    recommendedQuality: 'Low' | 'Balanced' | 'High';
    recommendedParticleCount: number;
    recommendedBackgroundSegments: number;
}

/**
 * Detects if device is mobile based on user agent and screen size
 */
export const detectDevice = (): DeviceInfo => {
    if (typeof window === 'undefined') {
        return {
            isMobile: false,
            isTablet: false,
            isDesktop: true,
            isLowEnd: false,
            pixelRatio: 1,
            recommendedQuality: 'High',
            recommendedParticleCount: 600,
            recommendedBackgroundSegments: 60,
        };
    }

    const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
    const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
    
    const width = window.innerWidth;
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2); // Cap at 2 for performance
    
    // Screen size based detection
    const isSmallScreen = width < 768;
    const isTabletScreen = width >= 768 && width < 1024;
    
    const isMobile = isMobileUA || isSmallScreen;
    const isTablet = isTabletScreen && !isMobileUA;
    const isDesktop = !isMobile && !isTablet;

    // Low-end device detection (heuristic)
    const hardwareConcurrency = navigator.hardwareConcurrency || 4;
    const deviceMemory = (navigator as any).deviceMemory || 4; // GB
    const isLowEnd = hardwareConcurrency <= 4 || deviceMemory <= 2 || pixelRatio > 2;

    // Quality recommendations
    let recommendedQuality: 'Low' | 'Balanced' | 'High' = 'Balanced';
    if (isMobile || isLowEnd) {
        recommendedQuality = 'Low';
    } else if (isTablet) {
        recommendedQuality = 'Balanced';
    } else {
        recommendedQuality = 'High';
    }

    // Particle count optimization
    let recommendedParticleCount = 600;
    if (isMobile || isLowEnd) {
        recommendedParticleCount = 150; // 75% reduction
    } else if (isTablet) {
        recommendedParticleCount = 300; // 50% reduction
    }

    // Background geometry optimization
    let recommendedBackgroundSegments = 60;
    if (isMobile || isLowEnd) {
        recommendedBackgroundSegments = 32; // ~47% reduction
    } else if (isTablet) {
        recommendedBackgroundSegments = 48; // 20% reduction
    }

    return {
        isMobile,
        isTablet,
        isDesktop,
        isLowEnd,
        pixelRatio,
        recommendedQuality,
        recommendedParticleCount,
        recommendedBackgroundSegments,
    };
};

/**
 * Hook to get device info (can be used in React components)
 */
export const useDeviceInfo = (): DeviceInfo => {
    if (typeof window === 'undefined') {
        return detectDevice();
    }

    // Use a simple state to cache the detection
    const cached = (window as any).__deviceInfo as DeviceInfo | undefined;
    if (cached) {
        return cached;
    }

    const info = detectDevice();
    (window as any).__deviceInfo = info;
    return info;
};

