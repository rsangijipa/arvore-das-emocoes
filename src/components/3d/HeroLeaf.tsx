import React, { useRef, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useStore } from '../../store/useStore';
import { useOptimizedTextureLoader } from '../../hooks/useOptimizedTextureLoader';

export const HeroLeaf: React.FC = () => {
    const focusedLeaf = useStore(state => state.focusedLeaf);
    const selectedMessage = useStore(state => state.selectedMessage);
    const setFocusedLeaf = useStore(state => state.setFocusedLeaf);
    const setSelectedMessage = useStore(state => state.setSelectedMessage);
    const setInteractionLock = useStore(state => state.setInteractionLock);

    // Refs for animation state
    const meshRef = useRef<THREE.Mesh>(null);
    const { camera } = useThree();
    const progressRef = useRef(0);
    const initialTransformRef = useRef<{ pos: THREE.Vector3, quat: THREE.Quaternion, scale: THREE.Vector3 } | null>(null);

    // Easing Function: EaseInOutCubic
    const easeInOutCubic = (t: number) => {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    // Protocol 2: planeGeometry args={[1.2, 1.6]}
    const geometry = useMemo(() => new THREE.PlaneGeometry(1.2, 1.6), []);

    const material = useMemo(() => {
        return new THREE.MeshStandardMaterial({
            color: '#ffffff',
            roughness: 0.6,
            metalness: 0.1,
            transparent: true,
            side: THREE.DoubleSide
            // Note: We are relying on the texture having transparency or being a rectangular photo.
            // Protocol suggests "Suas texturas são JPGs retangulares" + "Card Botânico".
            // If they are JPGs without alpha, they will be rects.
            // If we want rounded corners, we could use an alpha map, but the protocol said "Abandone o alphaMap gerado via Canvas".
            // So we render the full rect.
        });
    }, []);

    const textureUrls = useMemo(() => {
        const base = import.meta.env.BASE_URL || '/';
        const cleanBase = base.endsWith('/') ? base : `${base}/`;
        return [
            `${cleanBase}textures/leaves/leaf_tex_01.png`,
            `${cleanBase}textures/leaves/leaf_tex_02.png`,
            `${cleanBase}textures/leaves/leaf_tex_03.png`,
            `${cleanBase}textures/leaves/leaf_tex_04.png`,
            `${cleanBase}textures/leaves/leaf_tex_05.png`
        ];
    }, []);

    // We can assume HeroLeaf doesn't need mobile optimization param if it's the "Hero" 
    // but consistent usage is better.
    // However, HeroLeaf is arguably high-res. 
    // Let's passed false for isMobile to ensure highest quality for the Hero Leaf? 
    // Or respect device settings. Let's respect device settings but maybe with higher quality overrides if needed.
    // The user didn't specify, so I'll trust generic device info.
    // Wait, HeroLeaf needs access to store for generic device info?
    // Not exposed in store right now, wait, yes it is: deviceInfo.
    const { deviceInfo } = useStore();
    const textures = useOptimizedTextureLoader(textureUrls, deviceInfo.isMobile);

    // Initialize Animation State when focusedLeaf changes
    useLayoutEffect(() => {
        if (focusedLeaf && meshRef.current) {
            const mat = focusedLeaf.matrix;
            const startPos = new THREE.Vector3();
            const startQuat = new THREE.Quaternion();
            const startScale = new THREE.Vector3();
            mat.decompose(startPos, startQuat, startScale);

            meshRef.current.position.copy(startPos);
            meshRef.current.quaternion.copy(startQuat);
            meshRef.current.scale.copy(startScale);
            meshRef.current.visible = true;

            initialTransformRef.current = { pos: startPos, quat: startQuat, scale: startScale };
            progressRef.current = 0;

            const tex = textures[focusedLeaf.textureIndex] || textures[0];
            const textureClone = tex.clone();
            textureClone.colorSpace = THREE.SRGBColorSpace;
            textureClone.flipY = false;

            if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
                meshRef.current.material.map = textureClone;
                meshRef.current.material.needsUpdate = true;
            }
        } else {
            progressRef.current = 0;
            initialTransformRef.current = null;
        }
    }, [focusedLeaf, textures]);

    // Animation Loop
    useFrame((state, delta) => {
        if (!focusedLeaf || !meshRef.current || !initialTransformRef.current) return;

        const distance = 1.8;
        // Position slightly off-center if needed, or center
        const targetNDC = new THREE.Vector3(0, 0.0, 0.5);
        targetNDC.unproject(camera);
        const dir = targetNDC.sub(camera.position).normalize();
        const targetPos = camera.position.clone().add(dir.multiplyScalar(distance));

        const targetQuat = new THREE.Quaternion();
        const lookAtMat = new THREE.Matrix4();
        // Look at camera
        lookAtMat.lookAt(targetPos, camera.position, camera.up);
        targetQuat.setFromRotationMatrix(lookAtMat);
        // Correct for text mirroring if needed. Protocol says: "scale={[-1, 1, 1]} se necessário" or rotation adjustment.
        // Usually LookAt makes Z point to camera. Plane is XY. So Front is +Z. 
        // If text is backward, rotate Y 180.
        // Let's assume default mapping is correct, if user sees mirror, we flip using scale.
        // For now, let's strictly follow rotation logic.

        const targetScale = new THREE.Vector3(1, 1, 1);
        const duration = 1.8;
        progressRef.current = Math.min(1, progressRef.current + delta / duration);
        const t = easeInOutCubic(progressRef.current);

        meshRef.current.position.lerpVectors(initialTransformRef.current.pos, targetPos, t);
        meshRef.current.quaternion.slerpQuaternions(initialTransformRef.current.quat, targetQuat, t);
        meshRef.current.scale.lerpVectors(initialTransformRef.current.scale, targetScale, t);

        if (t > 0.95) {
            const time = state.clock.elapsedTime;
            // Gentle float
            meshRef.current.position.y += Math.sin(time * 1.5) * 0.0005;
        }
    });

    const handleDismiss = () => {
        setFocusedLeaf(null);
        setSelectedMessage(null);
        setTimeout(() => setInteractionLock(false), 500);
    };

    if (!focusedLeaf) return null;

    const textOpacity = progressRef.current > 0.8 ? (progressRef.current - 0.8) * 5 : 0;

    return (
        <group>
            <mesh
                ref={meshRef}
                geometry={geometry}
                material={material}
                onClick={(e) => {
                    e.stopPropagation();
                    handleDismiss();
                }}
            >
                {selectedMessage && (
                    <Html
                        transform
                        occlude="blending"
                        position={[0, 0, 0.05]} // Slightly in front
                        // Rotation 180 Y if the leaf is looking at camera, to ensure HTML matches Plane orientation?
                        // Html transform usually aligns with plane. If text is flipped, check Scale in parent.
                        // Protocol said: "scale={[-1, 1, 1]} se necessário" for the mesh?
                        // If texture is flipped, we flip mesh. HTML is child.
                        style={{
                            width: '300px',
                            pointerEvents: 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            opacity: textOpacity,
                            transition: 'opacity 0.2s',
                            userSelect: 'none',
                        }}
                    >
                        <div
                            style={{
                                width: '100%',
                                backdropFilter: 'blur(12px)',
                                WebkitBackdropFilter: 'blur(12px)',
                                backgroundColor: 'rgba(20, 20, 20, 0.65)',
                                borderRadius: '16px',
                                padding: '24px',
                                border: '1px solid rgba(255,255,255,0.1)',
                                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                                color: '#ffffff',
                                textAlign: 'center'
                            }}
                        >
                            <p
                                style={{
                                    fontFamily: 'serif',
                                    fontSize: '1.2rem',
                                    lineHeight: '1.6',
                                    fontWeight: 500,
                                    margin: '0 0 12px 0',
                                    textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                                }}
                            >
                                "{selectedMessage.text}"
                            </p>
                            {selectedMessage.author && (
                                <p
                                    style={{
                                        fontSize: '0.75rem',
                                        letterSpacing: '0.2em',
                                        textTransform: 'uppercase',
                                        opacity: 0.8,
                                        margin: 0
                                    }}
                                >
                                    — {selectedMessage.author}
                                </p>
                            )}
                            <div style={{
                                marginTop: '16px',
                                fontSize: '0.6rem',
                                opacity: 0.4,
                                textTransform: 'uppercase',
                                letterSpacing: '0.1em'
                            }}>
                                Toque para devolver
                            </div>
                        </div>
                    </Html>
                )}
            </mesh>

            {/* Click Catcher Background when active */}
            <mesh
                position={[0, 0, 0]}
                onClick={(e) => {
                    e.stopPropagation();
                    handleDismiss();
                }}
                visible={false} // Raycast only
            >
                <planeGeometry args={[100, 100]} />
                <meshBasicMaterial />
            </mesh>
        </group>
    );
};
