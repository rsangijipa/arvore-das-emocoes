import React, { useRef, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useSafeTexture } from '../../hooks/useSafeTexture';
import { useStore } from '../../store/useStore';

interface Background360Props {
    rotationSpeed?: number;
    showSphereFallback?: boolean;
}

export const Background360: React.FC<Background360Props> = () => {
    const { deviceInfo } = useStore();

    const backgroundUrl = useMemo(() => {
        const base = import.meta.env.BASE_URL || '/';
        const cleanBase = base.endsWith('/') ? base : `${base}/`;
        return `${cleanBase}fundo.jpeg`;
    }, []);

    // Use Safe Loader - Never suspends
    const texture = useSafeTexture(backgroundUrl, deviceInfo.isMobile);
    const sphereRef = useRef<THREE.Mesh>(null);
    const { scene } = useThree();

    useLayoutEffect(() => {
        // Ensure mapping is correct whenever texture updates (placeholder -> real)
        texture.mapping = THREE.EquirectangularReflectionMapping;
        // Environment needs this mapping to work correctly
    }, [texture]);

    // Apply texture to environment for lighting
    useLayoutEffect(() => {
        if (texture.name !== 'SAFE_PLACEHOLDER') {
            scene.environment = texture;
        }
        return () => {
            scene.environment = null;
        };
    }, [scene, texture]);

    const materialRef = useRef<THREE.MeshBasicMaterial>(null);

    useFrame((state, delta) => {
        if (!sphereRef.current) return;

        // Manual Scene Background Cleanup to avoid conflicts
        if (state.scene.background) {
            state.scene.background = null;
        }

        // Static background - no rotation
        sphereRef.current.rotation.y = 0;
        sphereRef.current.position.set(0, 0, 0);

        // Keep environment static
        if ('environmentRotation' in scene) {
            // eslint-disable-next-line
            (scene as any).environmentRotation.y = 0;
        }

        // Fade In when real texture loads
        if (materialRef.current) {
            const targetOpacity = texture.name === 'SAFE_PLACEHOLDER' ? 0 : 1;
            materialRef.current.opacity = THREE.MathUtils.lerp(materialRef.current.opacity, targetOpacity, delta * 2.0);
        }
    });

    // Use optimized geometry based on device
    const segments = deviceInfo.recommendedBackgroundSegments;
    const rings = Math.floor(segments * 0.67); // Maintain aspect ratio

    return (
        <mesh ref={sphereRef} scale={[-1, 1, 1]}>
            <sphereGeometry args={[500, segments, rings]} />
            <meshBasicMaterial
                ref={materialRef}
                map={texture}
                side={THREE.BackSide}
                toneMapped={false}
                fog={false}
                transparent={true}
                opacity={0}
            />
        </mesh>
    );
};
