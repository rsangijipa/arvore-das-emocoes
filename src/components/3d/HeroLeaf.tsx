import React, { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { useGLTF, Float, Html } from '@react-three/drei';
import type { EmotionData } from '../../types';

interface HeroLeafProps {
    emotion: EmotionData;
    tint?: string;
}

export const HeroLeaf: React.FC<HeroLeafProps> = ({ emotion, tint = "#ffffff" }) => {
    const group = useRef<THREE.Group>(null);
    const { scene } = useGLTF("/folha.glb");
    // Clone scene to avoid shared state issues if used multiple times (though here it's unique)
    const clonedScene = React.useMemo(() => scene.clone(), [scene]);

    // Centralize and scale leaf
    useLayoutEffect(() => {
        const root = clonedScene;
        const box = new THREE.Box3().setFromObject(root);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Center pivot
        root.position.sub(center);

        // Cinematic Scale
        const maxDim = Math.max(size.x, size.y, size.z);
        const s = 2.0 / maxDim;
        root.scale.setScalar(s);

        // Material Upgrade (PBR + Transmission)
        root.traverse((obj) => {
            if ((obj as THREE.Mesh).isMesh) {
                const mesh = obj as THREE.Mesh;
                const prevMat = mesh.material as THREE.MeshStandardMaterial;
                const map = prevMat?.map || null;

                const mat = new THREE.MeshPhysicalMaterial({
                    map,
                    color: new THREE.Color(tint),
                    metalness: 0.0,
                    roughness: 0.45,
                    clearcoat: 0.35,
                    clearcoatRoughness: 0.25,

                    // Transmission (Light passing through)
                    transmission: 0.20,
                    thickness: 0.18,
                    ior: 1.35, // Glass-like index of refraction
                    attenuationColor: new THREE.Color(tint),
                    attenuationDistance: 1.2,

                    side: THREE.DoubleSide,
                });

                // Fake bump from texture if no normal map
                if (map) {
                    mat.bumpMap = map;
                    mat.bumpScale = 0.05;
                }

                mesh.material = mat;
                mesh.castShadow = true;
                mesh.receiveShadow = true;
            }
        });
    }, [clonedScene, tint]);

    return (
        <group ref={group} position={[0, 0, 0]} rotation={[0, -0.25, 0]}>
            <Float speed={0.6} rotationIntensity={0.15} floatIntensity={0.15}>
                <primitive object={clonedScene} />

                {/* HTML Overlay for Text */}
                <Html center transform distanceFactor={1.5} style={{ pointerEvents: "none" }}>
                    <div className="text-center w-[400px] select-none">
                        <div
                            className="font-serif text-5xl md:text-6xl text-boho-dark/90 drop-shadow-sm leading-tight mb-4"
                            style={{ textShadow: '0 2px 10px rgba(0,0,0,0.1)' }}
                        >
                            "{emotion.text}"
                        </div>
                        <div className="font-sans text-sm tracking-[0.2em] font-bold text-boho-clay uppercase opacity-70">
                            {emotion.category} • {emotion.subcategory}
                        </div>
                        <div className="mt-4 font-serif text-lg italic text-boho-text/80">
                            {/* Placeholder for reflection date or extra info */}
                            {new Date(emotion.timestamp || Date.now()).toLocaleDateString()}
                        </div>
                    </div>
                </Html>
            </Float>
        </group>
    );
};

useGLTF.preload("/folha.glb");
