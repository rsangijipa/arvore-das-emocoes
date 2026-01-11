import * as THREE from 'three';



import { KTX2Loader } from 'three-stdlib';

interface ResourceEntry<T> {
    item: T;
    lastUsed: number;
    refCount: number;
    id: string;
}

/**
 * ResourceManager
 * Singleton responsible for managing the lifecycle of 3D resources.
 * Prevents memory leaks by tracking references and enforcing cache limits.
 */
class ResourceManager {
    private static instance: ResourceManager;

    // Caches with metadata
    private textures = new Map<string, ResourceEntry<THREE.Texture>>();
    private geometries = new Map<string, ResourceEntry<THREE.BufferGeometry>>();
    private materials = new Map<string, ResourceEntry<THREE.Material>>();

    // Configuration
    private readonly MAX_TEXTURES = 48; // Limit to prevent OOM
    private readonly CLEANUP_INTERVAL = 10000; // Check every 10s
    private readonly TEXTURE_TIMEOUT = 60000; // Dispose textures unused for 60s

    private cleanupIntervalId: any;

    private constructor() {
        this.startCleanupLoop();
    }

    public static getInstance(): ResourceManager {
        if (!ResourceManager.instance) {
            ResourceManager.instance = new ResourceManager();
        }
        return ResourceManager.instance;
    }

    private startCleanupLoop() {
        if (typeof window !== 'undefined') {
            this.cleanupIntervalId = setInterval(() => this.performCleanup(), this.CLEANUP_INTERVAL);
        }
    }

    public stopCleanupLoop() {
        if (this.cleanupIntervalId) {
            clearInterval(this.cleanupIntervalId);
            this.cleanupIntervalId = null;
        }
    }

    // -------------------------------------------------------------------------
    // TEXTURES
    // -------------------------------------------------------------------------

    public getTexture(url: string): THREE.Texture | undefined {
        const entry = this.textures.get(url);
        if (entry) {
            entry.lastUsed = Date.now();
            return entry.item;
        }
        return undefined;
    }

    public registerTexture(url: string, texture: THREE.Texture): void {
        if (this.textures.has(url)) return;

        // Enforce limit before adding
        if (this.textures.size >= this.MAX_TEXTURES) {
            this.forceEvictOneTexture();
        }

        this.textures.set(url, {
            item: texture,
            lastUsed: Date.now(),
            refCount: 1, // Assume 1 ref on creation
            id: url
        });

        // Ensure clean disposal
        texture.name = url;
    }

    public retainTexture(url: string): void {
        const entry = this.textures.get(url);
        if (entry) {
            entry.refCount++;
            entry.lastUsed = Date.now();
        }
    }

    public releaseTexture(url: string): void {
        const entry = this.textures.get(url);
        if (entry) {
            entry.refCount--;
            // We don't dispose immediately, we let the cleanup loop handle it
            // based on timeout and refCount <= 0
        }
    }

    // -------------------------------------------------------------------------
    // GEOMETRIES
    // -------------------------------------------------------------------------

    public getGeometry(id: string): THREE.BufferGeometry | undefined {
        const entry = this.geometries.get(id);
        if (entry) {
            entry.lastUsed = Date.now();
            return entry.item;
        }
        return undefined;
    }

    public registerGeometry(id: string, geometry: THREE.BufferGeometry): void {
        if (this.geometries.has(id)) return;

        this.geometries.set(id, {
            item: geometry,
            lastUsed: Date.now(),
            refCount: 1,
            id
        });
        geometry.name = id;
    }

    public retainGeometry(id: string): void {
        const entry = this.geometries.get(id);
        if (entry) {
            entry.refCount++;
            entry.lastUsed = Date.now();
        }
    }

    public releaseGeometry(id: string): void {
        const entry = this.geometries.get(id);
        if (entry) {
            entry.refCount--;
        }
    }

    // -------------------------------------------------------------------------
    // MATERIALS
    // -------------------------------------------------------------------------

    public getMaterials(id: string): THREE.Material | undefined {
        const entry = this.materials.get(id);
        if (entry) {
            entry.lastUsed = Date.now();
            return entry.item;
        }
        return undefined;
    }

    public registerMaterial(id: string, material: THREE.Material): void {
        if (this.materials.has(id)) return;

        this.materials.set(id, {
            item: material,
            lastUsed: Date.now(),
            refCount: 1,
            id
        });
        material.name = id;
    }

    public retainMaterial(id: string): void {
        const entry = this.materials.get(id);
        if (entry) {
            entry.refCount++;
            entry.lastUsed = Date.now();
        }
    }

    public releaseMaterial(id: string): void {
        const entry = this.materials.get(id);
        if (entry) {
            entry.refCount--;
            // Let cleanup loop handle exact disposal if needed
        }
    }

    // -------------------------------------------------------------------------
    // CLEANUP LOGIC
    // -------------------------------------------------------------------------

    private performCleanup() {
        const now = Date.now();

        // 1. Textures
        // Dispose if refCount <= 0 OR (refCount <= 1 AND timeout passed)
        // We keep refCount 1 for the cache itself usually, but here we count external refs.
        // If external refs are 0, we can dispose if timeout passed.

        for (const [url, entry] of this.textures.entries()) {
            const idleTime = now - entry.lastUsed;

            // IF unused for too long, dispose
            if (entry.refCount <= 0 && idleTime > this.TEXTURE_TIMEOUT) {
                this.disposeTexture(url);
            }
        }

        // 2. Materials
        for (const [id, entry] of this.materials.entries()) {
            const idleTime = now - entry.lastUsed;
            if (entry.refCount <= 0 && idleTime > this.TEXTURE_TIMEOUT) {
                entry.item.dispose();
                this.materials.delete(id);
            }
        }
    }

    private forceEvictOneTexture() {
        // Find oldest used texture with 0 refs.
        // If none with 0 refs, find oldest used period.
        let candidateUrl: string | null = null;
        let oldestTime = Infinity;

        for (const [url, entry] of this.textures.entries()) {
            if (entry.refCount <= 0 && entry.lastUsed < oldestTime) {
                oldestTime = entry.lastUsed;
                candidateUrl = url;
            }
        }

        // If no unreferenced texture, try to find LRU even if referenced (dangerous but necessary for OOM)
        // But evicting a referenced texture will cause white mesh.
        // Better to warn.
        if (!candidateUrl) {
            console.warn('[ResourceManager] Cache full but all textures referenced. Ignoring eviction.');
            return;
        }

        if (candidateUrl) {
            this.disposeTexture(candidateUrl);
        }
    }

    private disposeTexture(url: string) {
        const entry = this.textures.get(url);
        if (entry) {
            // console.log(`[ResourceManager] Disposing texture: ${url}`);
            entry.item.dispose();
            this.textures.delete(url);
        }
    }

    public disposeAll() {
        this.textures.forEach(e => e.item.dispose());
        this.textures.clear();

        this.geometries.forEach(e => e.item.dispose());
        this.geometries.clear();

        this.materials.forEach(e => e.item.dispose());
        this.materials.clear();
    }

    // Debug stats
    public getStats() {
        return {
            textures: this.textures.size,
            geometries: this.geometries.size,
            materials: this.materials.size
        };
    }

    // -------------------------------------------------------------------------
    // LOADERS (LAZY INITIALIZED)
    // -------------------------------------------------------------------------
    private ktx2Loader: any; // Type as any to avoid import issues if package missing, but we installed it.

    public getKTX2Loader(renderer?: THREE.WebGLRenderer): any {
        if (!this.ktx2Loader) {
            this.ktx2Loader = new KTX2Loader();
            this.ktx2Loader.setTranscoderPath('https://unpkg.com/three@0.160.0/examples/jsm/libs/basis/');
        }
        if (renderer && !this.ktx2Loader.renderer) {
            this.ktx2Loader.detectSupport(renderer);
        }
        return this.ktx2Loader;
    }
}

export const resourceManager = ResourceManager.getInstance();
