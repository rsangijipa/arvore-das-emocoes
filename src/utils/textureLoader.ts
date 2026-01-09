/**
 * Optimized texture loading utilities with retry, fallback and caching
 * Supports WebP/AVIF with fallback to JPG
 */

import * as THREE from 'three';

export interface TextureLoadOptions {
    generateMipmaps?: boolean;
    minFilter?: THREE.TextureFilter;
    magFilter?: THREE.TextureFilter;
    isMobile?: boolean;
    flipY?: boolean;
    anisotropy?: number;
}

// In-memory Promise cache to prevent duplicate requests for the same URL
const textureCache: Record<string, Promise<THREE.Texture> | undefined> = {};

// Fallback texture generation (1x1 pink pixel)
const createFallbackTexture = (): THREE.Texture => {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = '#ff00ff';
        ctx.fillRect(0, 0, 1, 1);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.name = 'fallback_texture';
    return texture;
};

// Singleton fallback texture
let fallbackTexture: THREE.Texture | null = null;
const getFallbackTexture = () => {
    if (!fallbackTexture) {
        fallbackTexture = createFallbackTexture();
    }
    return fallbackTexture;
};

/**
 * Load texture with optimized settings, retry logic, and caching
 */
export const loadOptimizedTexture = (
    url: string,
    options: TextureLoadOptions = {}
): Promise<THREE.Texture> => {
    // Check cache first
    if (textureCache[url]) {
        return textureCache[url];
    }

    const {
        generateMipmaps = !options.isMobile,
        minFilter = options.isMobile ? THREE.LinearFilter : THREE.LinearMipmapLinearFilter,
        magFilter = THREE.LinearFilter,
        isMobile = false,
        flipY = false,
    } = options;

    const loadTask = new Promise<THREE.Texture>((resolve) => {
        const loader = new THREE.TextureLoader();
        let retries = 0;
        const maxRetries = 3;

        const attemptLoad = () => {
            loader.load(
                url,
                (texture) => {
                    // Success
                    texture.colorSpace = THREE.SRGBColorSpace;
                    texture.flipY = flipY;
                    texture.generateMipmaps = generateMipmaps;
                    texture.minFilter = minFilter as THREE.MinificationTextureFilter;
                    texture.magFilter = magFilter as THREE.MagnificationTextureFilter;

                    if (isMobile) {
                        texture.anisotropy = 1;
                    } else if (options.anisotropy) {
                        texture.anisotropy = options.anisotropy;
                    }

                    resolve(texture);
                },
                undefined, // progress
                (err) => {
                    // Error
                    console.warn(`Failed to load texture: ${url} (Attempt ${retries + 1}/${maxRetries + 1})`, err);

                    if (retries < maxRetries) {
                        retries++;
                        // Exponential backoff: 500ms, 1000ms, 2000ms
                        setTimeout(attemptLoad, 500 * Math.pow(2, retries - 1));
                    } else {
                        console.error(`Persistent failure loading ${url}. Using fallback.`);
                        const fb = getFallbackTexture();
                        // Clone fallback so we can apply specific filters/options if needed, 
                        // though sharing the same instance is more efficient for just avoiding crash.
                        // We'll return the singleton for efficiency.
                        resolve(fb);
                    }
                }
            );
        };

        attemptLoad();
    });

    textureCache[url] = loadTask;
    return loadTask;
};

/**
 * Preload textures with priority
 */
export const preloadTextures = async (
    urls: string[],
    isMobile: boolean = false
): Promise<THREE.Texture[]> => {
    // Dedup URLs
    const uniqueUrls = [...new Set(urls)];

    const loadPromises = uniqueUrls.map(url =>
        loadOptimizedTexture(url, { isMobile })
    );

    return Promise.all(loadPromises);
};

/**
 * Get WebP version if supported, fallback to JPG
 */
export const getOptimalTextureUrl = (baseUrl: string): string => {
    if (typeof document === 'undefined') return baseUrl;

    // Simple feature detection
    const supportsWebP = document.createElement('canvas').toDataURL('image/webp').indexOf('data:image/webp') === 0;

    if (supportsWebP && baseUrl.endsWith('.jpg')) {
        return baseUrl.replace('.jpg', '.webp');
    }

    // If you have compression for PNGs or other formats, handle them here
    return baseUrl;
};
