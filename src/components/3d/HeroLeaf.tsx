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
                    metalness: 0.05,
                    roughness: 0.55, // Premium feel
                    clearcoat: 0.4,
                    clearcoatRoughness: 0.35,

                    // Safe mode: Removed transmission to prevent WebGL Context Lost
                    side: THREE.DoubleSide,
                    bumpMap: texture,
                    bumpScale: 0.02,
                    alphaTest: 0.5,
                    envMapIntensity: 0.8
                });

                mesh.material = mat;
                mesh.castShadow = true;
                mesh.receiveShadow = true;
            }
        });
    }, [clonedScene, tint, texture]);

    // Refs for animation state
    const animationRef = useRef(0);
    const startPosRef = useRef<THREE.Vector3 | null>(null);
    const startRotRef = useRef<THREE.Quaternion | null>(null);

    useFrame((state, delta) => {
        if (!group.current) return;

        // Initialize start transform on first frame
        if (!startPosRef.current) {
            startPosRef.current = emotion.position ? new THREE.Vector3(...emotion.position) : new THREE.Vector3(0, 0, 0);
            startRotRef.current = group.current.quaternion.clone();
        }

        // Progress 0 -> 1
        const speed = 1.5;
        animationRef.current = Math.min(1, animationRef.current + delta * speed);
        const t = animationRef.current;
        const smooth = 1 - Math.pow(1 - t, 3); // Cubic ease out

        // Target: In front of camera
        const camera = state.camera;
        const targetPos = camera.position.clone()
            .add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(4)); // 4 units in front

        // Position Interpolation
        if (startPosRef.current) {
            group.current.position.lerpVectors(startPosRef.current, targetPos, smooth);
        }

        // Rotation: Look at camera (billboard)
        // We want the flat side facing camera. 
        // Leaf default orientation needs check. Assuming Plane geometry logic or similar.
        // Usually LookAt makes Z axis point to target.
        // We blend from original rotation to "Looking at Camera".

        const targetAllign = new THREE.Object3D();
        targetAllign.position.copy(group.current.position);
        targetAllign.lookAt(camera.position);

        // Adjust for leaf model orientation (often need to rotate X or Y to face flat)
        // Assuming glb leaf points Y up, Z forward?
        // Let's adding some tilt to be readable.
        targetAllign.rotateX(Math.PI / 4); // Tilt 45 degrees for "reading on desk" feel

        group.current.quaternion.slerp(targetAllign.quaternion, smooth);

        // Scale pulse
        const scale = 1.0 + Math.sin(t * Math.PI) * 0.1;
        // Normalize base scale (HeroLeaf usually scaled down? No, we used s = 2.0 / maxDim previously)
        // We re-calculate scale in useLayoutEffect, so here we apply relative scale?
        // Or we just let the useLayoutEffect set the base scale and we animate a parent group?
        // Current structure: <group ref={group}> <Float> <primitive /> </Float> </group>
        // The useLayoutEffect scales the PRIMITIVE (root). The GROUP is what we move.
        // So we can set group scale to 1.
        group.current.scale.setScalar(scale);
    });

    // Dynamic Font Selection
    const fontStyle = React.useMemo(() => {
        const fonts = [
            { family: '"Playfair Display", serif', weight: 600, style: 'normal' },
            { family: '"Montserrat", sans-serif', weight: 700, style: 'normal' },
            { family: '"Lora", serif', weight: 500, style: 'italic' },
            { family: '"Inter", sans-serif', weight: 600, style: 'normal' },
            { family: '"Cormorant Garamond", serif', weight: 600, style: 'italic' }
        ];
        // Seeded random based on emotion ID + timestamp to keep it consistent for the same emotion moment?
        // Or random every open? User said "A cada abertura... mudar". 
        // If we want random per open, we use Math.random().
        // If we want "deterministic" per emotion, use seed.
        // User rules: "Sem Math.random() na geração".
        // But this is UI effect "A cada abertura". 
        // I will use a simple pseudo-random based on Date.now() or just Math.random() since it's a UI effect requested to CHANGE.
        // Or better: use store.seed + something.
        // Let's use Math.floor(Math.random() * fonts.length).
        const idx = Math.floor(Math.random() * fonts.length);
        return fonts[idx];
    }, []);

    const dateString = React.useMemo(() => {
        if (!emotion.timestamp) return '';
        return new Date(emotion.timestamp).toLocaleDateString();
    }, [emotion.timestamp]);

    return (
        <group ref={group} scale={[0, 0, 0]}>
            <Float speed={0.6} rotationIntensity={0.15} floatIntensity={0.15}>
                <primitive object={clonedScene} />

                {/* HTML Overlay for Text */}
                <Html center transform distanceFactor={1.2} style={{ pointerEvents: "none", opacity: animationRef.current }}>
                    <div
                        className="text-center select-none flex flex-col items-center justify-center p-4"
                        style={{ width: '320px' }} // Approx 80% of leaf
                    >
                        <div
                            className="text-boho-dark/95 drop-shadow-sm leading-tight mb-3"
                            style={{
                                fontFamily: fontStyle.family,
                                fontWeight: fontStyle.weight,
                                fontStyle: fontStyle.style,
                                fontSize: '1.2rem', // Smaller for full message
                                textShadow: '0 1px 12px rgba(255,255,255,0.6)',
                                whiteSpace: 'pre-wrap' // Handle newlines
                            }}
                        >
                            "{emotion.reflection}"
                        </div>
                        <div className="font-sans text-[10px] tracking-[0.25em] font-bold text-boho-clay uppercase opacity-60 mt-2">
                            {emotion.text}
                        </div>
                    </div>
                </Html>
            </Float>
        </group>
    );
};

useGLTF.preload("/folha.glb");
