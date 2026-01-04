/**
 * Optimized texture loading utilities
 * Supports WebP/AVIF with fallback to JPG
 */

import * as THREE from 'three';

export interface TextureLoadOptions {
    generateMipmaps?: boolean;
    minFilter?: THREE.TextureFilter;
    magFilter?: THREE.TextureFilter;
    isMobile?: boolean;
}

/**
 * Load texture with optimized settings based on device
 */
export const loadOptimizedTexture = (
    url: string,
    options: TextureLoadOptions = {}
): Promise<THREE.Texture> => {
    const {
        generateMipmaps = !options.isMobile,
        minFilter = options.isMobile ? THREE.LinearFilter : THREE.LinearMipmapLinearFilter,
        magFilter = THREE.LinearFilter,
        isMobile = false,
    } = options;

    return new Promise((resolve, reject) => {
        const loader = new THREE.TextureLoader();
        
        loader.load(
            url,
            (texture) => {
                texture.colorSpace = THREE.SRGBColorSpace;
                texture.flipY = false;
                texture.generateMipmaps = generateMipmaps;
                texture.minFilter = minFilter;
                texture.magFilter = magFilter;
                
                // Optimize for mobile
                if (isMobile) {
                    texture.anisotropy = 1; // Lower anisotropy on mobile
                }
                
                resolve(texture);
            },
            undefined,
            reject
        );
    });
};

/**
 * Preload textures with priority
 */
export const preloadTextures = async (
    urls: string[],
    isMobile: boolean = false
): Promise<THREE.Texture[]> => {
    const loadPromises = urls.map(url => 
        loadOptimizedTexture(url, { isMobile })
    );
    
    return Promise.all(loadPromises);
};

/**
 * Get WebP version if supported, fallback to JPG
 */
export const getOptimalTextureUrl = (baseUrl: string): string => {
    // Check if browser supports WebP
    const supportsWebP = typeof document !== 'undefined' && 
        document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0;
    
    if (supportsWebP && baseUrl.endsWith('.jpg')) {
        return baseUrl.replace('.jpg', '.webp');
    }
    
    return baseUrl;
};

