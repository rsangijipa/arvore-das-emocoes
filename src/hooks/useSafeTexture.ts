import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { resourceManager } from '../utils/ResourceManager';

// Placeholder texture (1x1 transparent pixel or gray)
const createPlaceholder = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 2;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = '#22190c'; // Matches background
        ctx.fillRect(0, 0, 2, 2);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.name = 'SAFE_PLACEHOLDER';
    return tex;
};

// We can keep a static placeholder or put it in resourceManager too?
// For now static is fine, it's tiny.
const placeholderTexture = createPlaceholder();

/**
 * useSafeTexture
 * Loads a texture without suspending React.
 * Returns a placeholder immediately, then the real texture when loaded.
 * Integrates with ResourceManager for caching and cleanup.
 */
export function useSafeTexture(url: string, isMobile: boolean = false): THREE.Texture {
    // 1. Check ResourceManager first
    const cached = resourceManager.getTexture(url);
    const [texture, setTexture] = useState<THREE.Texture>(cached || placeholderTexture);

    useEffect(() => {
        // Increment ref count for this url usage
        resourceManager.retainTexture(url);

        // If already cached and correct, check if we need to update state
        const existing = resourceManager.getTexture(url);
        if (existing) {
            if (texture !== existing) setTexture(existing);
            // We already retained above.
            return () => {
                resourceManager.releaseTexture(url);
            };
        }

        let active = true;
        const loader = new THREE.TextureLoader();

        // Setup CrossOrigin if needed
        loader.crossOrigin = 'Anonymous';

        loader.load(
            url,
            (loadedTex) => {
                if (!active) {
                    loadedTex.dispose();
                    return;
                }

                // Optimize immediately if mobile
                if (isMobile) {
                    loadedTex.minFilter = THREE.LinearFilter;
                    loadedTex.magFilter = THREE.LinearFilter;
                    loadedTex.generateMipmaps = false;
                }

                loadedTex.colorSpace = THREE.SRGBColorSpace;

                // Register with Manager
                resourceManager.registerTexture(url, loadedTex);

                setTexture(loadedTex);
            },
            undefined, // onProgress
            (err) => {
                console.warn(`[SafeTexture] Failed to load ${url}, using placeholder.`, err);
            }
        );

        return () => {
            active = false;
            // Release ref
            resourceManager.releaseTexture(url);
        };
    }, [url, isMobile]); // Dependency on texture state is not needed, logic inside handling it

    return texture;
}
