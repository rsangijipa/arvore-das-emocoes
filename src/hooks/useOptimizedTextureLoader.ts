import * as THREE from 'three';
import { loadOptimizedTexture } from '../utils/textureLoader';

// Simple resource cache for Suspense
const cache: Record<string, THREE.Texture | undefined> = {};
const promises: Record<string, Promise<THREE.Texture> | undefined> = {};
const errors: Record<string, any> = {};

function read(url: string, isMobile: boolean) {
    if (cache[url]) {
        return cache[url];
    }
    if (errors[url]) {
        throw errors[url];
    }
    if (promises[url]) {
        throw promises[url];
    }

    const promise = loadOptimizedTexture(url, { isMobile })
        .then((texture) => {
            cache[url] = texture;
            return texture;
        })
        .catch((err) => {
            // Should be handled by loadOptimizedTexture fallback, but just in case
            console.error("Critical error in loader hook", err);
            errors[url] = err;
        });

    promises[url] = promise;
    throw promise;
}

/**
 * Suspense-compatible hook for loading multiple textures
 */
export const useOptimizedTextureLoader = (urls: string[], isMobile: boolean = false): THREE.Texture[] => {
    // We need to read all urls. If any is missing, it will throw.
    // .map will iterate and the *first* one that throws will suspend the component.
    // When it resolves, React re-renders, and we proceed to the next, or all are ready.

    // Optimization: Check if all started
    urls.forEach(url => {
        if (!cache[url] && !promises[url] && !errors[url]) {
            read(url, isMobile); // This throws immediately
        }
    });

    // If we got here, maybe some are pending (if we didn't throw above? No, read throws).
    // Actually, if we want to run them in parallel, we should start them all, then read them.

    // Correct pattern for parallel load with Suspense:
    // 1. Kick off all promises if not started.
    // 2. Check if any is pending -> Throw Promise.all(pending)
    // 3. If all done -> return results.

    const pending: Promise<THREE.Texture>[] = [];

    urls.forEach(url => {
        if (!promises[url]) {
            // Start it
            const p = loadOptimizedTexture(url, { isMobile })
                .then((t) => { cache[url] = t; return t; })
                .catch((e) => { errors[url] = e; });
            promises[url] = p as Promise<THREE.Texture>;
        }

        if (!cache[url] && promises[url]) {
            pending.push(promises[url]);
        }
    });

    if (pending.length > 0) {
        throw Promise.all(pending);
    }

    // If we are here, everything is in cache (or errored, but we handle fallback in loader)
    return urls.map(url => cache[url]);
};
