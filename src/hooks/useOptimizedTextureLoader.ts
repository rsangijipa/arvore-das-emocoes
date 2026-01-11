import { useState, useEffect } from 'react';
import * as THREE from 'three';
import { resourceManager } from '../utils/ResourceManager';

// Shared placeholder
const createPlaceholder = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 2;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = '#22190c';
        ctx.fillRect(0, 0, 2, 2);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.name = 'OPT_LOADER_PLACEHOLDER';
    return tex;
};

const placeholder = createPlaceholder();

/**
 * useOptimizedTextureLoader
 * Loads multiple textures without suspending.
 * Returns placeholders immediately for any not-yet-loaded textures.
 * Integrates with ResourceManager.
 */
export const useOptimizedTextureLoader = (urls: string[], isMobile: boolean = false): THREE.Texture[] => {
    // Initialize state with cached textures or placeholder
    const [textures, setTextures] = useState<THREE.Texture[]>(() => {
        return urls.map(url => resourceManager.getTexture(url) || placeholder);
    });

    useEffect(() => {
        let active = true;
        const loader = new THREE.TextureLoader();
        loader.crossOrigin = 'Anonymous';

        // 1. Retain all requested textures
        urls.forEach(url => resourceManager.retainTexture(url));

        // 2. Load missing ones
        urls.forEach((url, index) => {
            // Check cache again in effect
            if (resourceManager.getTexture(url)) {
                // Already cached
            } else {
                const isKTX2 = url.endsWith('.ktx2');

                if (isKTX2) {
                    // Get KTX2 Loader (lazy init)
                    // converting global require to dynamic import or just accessing the singleton
                    // However, we need 'renderer' for detectSupport.
                    // We can try to access using import { useThree } but that breaks if hook used outside canvas.
                    // For now, let's assume standard png loader default, and if ktx2, we try to support it.
                    const ktx2Loader = resourceManager.getKTX2Loader(undefined); // Pass renderer later if possible

                    ktx2Loader.load(
                        url,
                        (loadedTex: THREE.Texture) => {
                            if (!active) { loadedTex.dispose(); return; }
                            loadedTex.colorSpace = THREE.SRGBColorSpace;
                            loadedTex.flipY = false;
                            resourceManager.registerTexture(url, loadedTex);
                            setTextures(prev => {
                                const next = [...prev];
                                next[index] = loadedTex;
                                return next;
                            });
                        },
                        undefined,
                        (err: unknown) => console.warn(`[KTX2Loader] Failed ${url}`, err)
                    );

                } else {
                    // Standard PNG/JPG
                    loader.load(
                        url,
                        (loadedTex) => {
                            if (!active) {
                                loadedTex.dispose();
                                return;
                            }

                            if (isMobile) {
                                loadedTex.minFilter = THREE.LinearFilter;
                                loadedTex.magFilter = THREE.LinearFilter;
                                loadedTex.generateMipmaps = false;
                            }
                            loadedTex.colorSpace = THREE.SRGBColorSpace;
                            loadedTex.flipY = false;

                            // Register
                            resourceManager.registerTexture(url, loadedTex);

                            // Update state - triggers re-render
                            setTextures(prev => {
                                const next = [...prev];
                                next[index] = loadedTex;
                                return next;
                            });
                        },
                        undefined,
                        (err) => {
                            console.warn(`[OptimizedLoader] Failed ${url}`, err);
                        }
                    );
                }
            }
        });

        // 3. Cleanup
        return () => {
            active = false;
            urls.forEach(url => resourceManager.releaseTexture(url));
        };
    }, [urls.join(','), isMobile]); // Dependency on URL list string to avoid deeper check

    return textures;
};
