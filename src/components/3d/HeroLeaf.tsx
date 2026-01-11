import React, { useRef, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { Text } from '@react-three/drei';
import { useStore } from '../../store/useStore';
import { useOptimizedTextureLoader } from '../../hooks/useOptimizedTextureLoader';
import { HERO_LEAF_CONSTANTS } from '../../constants/3d';
import { resourceManager } from '../../utils/ResourceManager';

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

    // Shared Geometry via ResourceManager
    const geometry = useMemo(() => {
        const key = 'hero_leaf_geo';
        let geo = resourceManager.getGeometry(key);
        if (!geo) {
            geo = new THREE.PlaneGeometry(HERO_LEAF_CONSTANTS.WIDTH, HERO_LEAF_CONSTANTS.HEIGHT);
            resourceManager.registerGeometry(key, geo);
        } else {
            resourceManager.retainGeometry(key);
        }
        return geo;
    }, []);

    // Cleanup geometry ref
    useLayoutEffect(() => {
        return () => resourceManager.releaseGeometry('hero_leaf_geo');
    }, []);

    const material = useMemo(() => {
        return new THREE.MeshStandardMaterial({
            color: '#ffffff',
            roughness: 0.6,
            metalness: 0.1,
            transparent: true,
            side: THREE.DoubleSide
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

    const { deviceInfo } = useStore();
    // Use optimized loader (handles caching via ResourceManager)
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

            // Apply texture directly (already cached and configured by hook)
            const tex = textures[focusedLeaf.textureIndex] || textures[0];

            if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
                meshRef.current.material.map = tex;
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

        const distance = HERO_LEAF_CONSTANTS.DISTANCE_FROM_CAMERA;
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

        const targetScale = new THREE.Vector3(1, 1, 1);
        const duration = HERO_LEAF_CONSTANTS.ANIMATION_DURATION;
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
                material={material}
                onClick={(e) => {
                    e.stopPropagation();
                    handleDismiss();
                }}
            >
                {/* Re-using geometry from useMemo, passed to args if needed, but here passed as prop */}
                <primitive object={geometry} attach="geometry" />

                {selectedMessage && (
                    <group position={[0, 0, 0.02]}>
                        <Text
                            fontSize={0.09}
                            maxWidth={0.9}
                            lineHeight={1.4}
                            textAlign="center"
                            color="#22190c"
                            anchorX="center"
                            anchorY="middle"
                            position={[0, 0.1, 0]}
                            fillOpacity={textOpacity}
                        >
                            {`"${selectedMessage.text}"`}
                        </Text>

                        {selectedMessage.author && (
                            <Text
                                fontSize={0.05}
                                maxWidth={0.8}
                                textAlign="center"
                                color="#22190c"
                                anchorX="center"
                                anchorY="top"
                                position={[0, -0.4, 0]}
                                fillOpacity={textOpacity * 0.7}
                            >
                                {`— ${selectedMessage.author}`}
                            </Text>
                        )}

                        <Text
                            fontSize={0.04}
                            color="#22190c"
                            anchorX="center"
                            position={[0, -0.7, 0]}
                            fillOpacity={textOpacity * 0.4}
                        >
                            TOQUE PARA DEVOLVER
                        </Text>
                    </group>
                )}
            </mesh>

            {/* Click Catcher Background when active */}
            <mesh
                position={[0, 0, 0]}
                onClick={(e) => {
                    e.stopPropagation();
                    handleDismiss();
                }}
                visible={false}
            >
                <planeGeometry args={[100, 100]} />
                <meshBasicMaterial />
            </mesh>
        </group>
    );
};

