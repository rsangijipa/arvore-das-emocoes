import React, { useRef, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useStore } from '../../store/useStore';
import { useOptimizedTextureLoader } from '../../hooks/useOptimizedTextureLoader';
import { HERO_LEAF_CONSTANTS } from '../../constants/3d';
import { resourceManager } from '../../utils/ResourceManager';

export const HeroLeaf: React.FC = () => {
    const focusedLeaf = useStore(state => state.focusedLeaf);
    const setFocusedLeaf = useStore(state => state.setFocusedLeaf);
    const setSelectedMessage = useStore(state => state.setSelectedMessage);
    const setInteractionLock = useStore(state => state.setInteractionLock);
    const setFocusedEmotion = useStore(state => state.setFocusedEmotion);
    const setCinematic = useStore(state => state.setCinematic);


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
        setFocusedEmotion(null);
        setCinematic(false);
        setTimeout(() => setInteractionLock(false), 500);
    };

    if (!focusedLeaf) return null;

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
                {/* Re-using geometry from useMemo */}
                <primitive object={geometry} attach="geometry" />
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

