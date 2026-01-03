import React, { useLayoutEffect, useRef } from 'react';
import * as THREE from 'three';
import { useGLTF, Float, Html } from '@react-three/drei';
import { useLoader, useFrame } from '@react-three/fiber';
import type { EmotionData } from '../../types';

interface HeroLeafProps {
    emotion: EmotionData;
    tint?: string;
}

export const HeroLeaf: React.FC<HeroLeafProps> = ({ emotion, tint = "#ffffff" }) => {
    const group = useRef<THREE.Group>(null);
    const { scene } = useGLTF("/folha.glb");

    // Load dynamic texture
    const textureUrl = emotion.textureUrl || '/textures/leaves/leaf_tex_01.png'; // Fallback path if needed, ensure it exists or use verified one
    // We generated textures in /textures/leaves/. Check if emotion.textureUrl uses full path.
    // In useEmotionData we set: `/textures/leaves/leaf_tex_0X.png`. So it should be fine.
    // However, if we migrated from old version, might be missing. 
    // Let's safe guard.
    const validUrl = textureUrl.startsWith('/') ? textureUrl : `/textures/leaves/${textureUrl}`;

    // Use useLoader to avoid hooks rule issues (useTexture is fine too)
    // FIXING IMPORT
    const texture = useLoader(THREE.TextureLoader, validUrl);

    useLayoutEffect(() => {
        if (texture) {
            // eslint-disable-next-line
            texture.colorSpace = THREE.SRGBColorSpace;
            // eslint-disable-next-line
            texture.flipY = false;
        }
    }, [texture]);

    const clonedScene = React.useMemo(() => scene.clone(), [scene]);

    // Centralize and scale leaf
    useLayoutEffect(() => {
        const root = clonedScene;
        const box = new THREE.Box3().setFromObject(root);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        root.position.sub(center);

        const maxDim = Math.max(size.x, size.y, size.z);
        const s = 2.0 / maxDim;
        root.scale.setScalar(s);

        root.traverse((obj) => {
            if ((obj as THREE.Mesh).isMesh) {
                const mesh = obj as THREE.Mesh;

                const mat = new THREE.MeshPhysicalMaterial({
                    map: texture,
                    color: new THREE.Color(tint).multiplyScalar(1.2), // Boost tint slightly
                    metalness: 0.1,
                    roughness: 0.6, // More rough for organic feel
                    clearcoat: 0.2,
                    clearcoatRoughness: 0.4,

                    // Reduced transmission to show texture
                    transmission: 0.05,
                    thickness: 0.5,
                    ior: 1.4,
                    attenuationColor: new THREE.Color(tint),
                    attenuationDistance: 2.0,

                    side: THREE.DoubleSide,
                    bumpMap: texture,
                    bumpScale: 0.02,
                    alphaTest: 0.5
                });

                mesh.material = mat;
                mesh.castShadow = true;
                mesh.receiveShadow = true;
            }
        });
    }, [clonedScene, tint, texture]);

    const animationRef = useRef(0);

    useFrame((state, delta) => {
        if (!group.current) return;

        // Progress 0 -> 1
        const speed = 2.0;
        animationRef.current = Math.min(1, animationRef.current + delta * speed);
        const t = animationRef.current;

        // Easing functions
        const backOut = (x: number) => {
            const c1 = 1.70158;
            const c3 = c1 + 1;
            return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
        };
        const smooth = 1 - Math.pow(1 - t, 4);

        // Position Jump: Start [0, -3, 1] -> End [0, 0, 0]
        const startPos = new THREE.Vector3(0, -3, 1);
        const targetPos = new THREE.Vector3(0, 0, 0);
        group.current.position.lerpVectors(startPos, targetPos, smooth);

        // Scale Elastic
        group.current.scale.setScalar(backOut(t));

        // Rotation Spin
        const startRot = new THREE.Euler(0, Math.PI, 0);
        const targetRot = new THREE.Euler(0, -0.25, 0);
        group.current.rotation.x = THREE.MathUtils.lerp(startRot.x, targetRot.x, smooth);
        group.current.rotation.y = THREE.MathUtils.lerp(startRot.y, targetRot.y, smooth);
        group.current.rotation.z = THREE.MathUtils.lerp(startRot.z, targetRot.z, smooth);
    });

    const dateString = React.useMemo(() => {
        if (!emotion.timestamp) return '';
        return new Date(emotion.timestamp).toLocaleDateString();
    }, [emotion.timestamp]);

    return (
        <group ref={group} position={[0, -3, 1]} rotation={[0, Math.PI, 0]} scale={[0, 0, 0]}>
            <Float speed={0.6} rotationIntensity={0.15} floatIntensity={0.15}>
                <primitive object={clonedScene} />

                {/* HTML Overlay for Text */}
                <Html center transform distanceFactor={1.5} style={{ pointerEvents: "none", opacity: animationRef.current }}>
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
                            {dateString}
                        </div>
                    </div>
                </Html>
            </Float>
        </group>
    );
};

useGLTF.preload("/folha.glb");
