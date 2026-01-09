import React, { useRef, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useLoader, useFrame, useThree } from '@react-three/fiber';
import { useStore } from '../../store/useStore';

interface Background360Props {
    rotationSpeed?: number;
    showSphereFallback?: boolean;
}

export const Background360: React.FC<Background360Props> = () => {
    const texture = useLoader(THREE.TextureLoader, '/fundo.jpeg');
    const { deviceInfo } = useStore();
    const sphereRef = useRef<THREE.Mesh>(null);
    const { scene } = useThree();

    // Optimize texture for mobile (clone to avoid modifying hook return)
    const optimizedTexture = useMemo(() => {
        if (deviceInfo.isMobile) {
            const cloned = texture.clone();
            cloned.minFilter = THREE.LinearFilter;
            cloned.magFilter = THREE.LinearFilter;
            cloned.generateMipmaps = false;
            return cloned;
        }
        return texture;
    }, [texture, deviceInfo.isMobile]);

    useLayoutEffect(() => {
        optimizedTexture.colorSpace = THREE.SRGBColorSpace;
        optimizedTexture.mapping = THREE.EquirectangularReflectionMapping;
    }, [optimizedTexture]);

    // Apply texture to environment for lighting
    useLayoutEffect(() => {
        scene.environment = optimizedTexture;
        return () => {
            scene.environment = null;
        };
    }, [scene, optimizedTexture]);

    const materialRef = useRef<THREE.MeshBasicMaterial>(null);

    useFrame((state, delta) => {
        if (!optimizedTexture || !sphereRef.current) return;

        // Manual Scene Background Cleanup
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

        // Fade In
        if (materialRef.current) {
            materialRef.current.opacity = THREE.MathUtils.lerp(materialRef.current.opacity, 1, delta * 2.0);
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
                map={optimizedTexture}
                side={THREE.BackSide}
                toneMapped={false}
                fog={false}
                transparent={true}
                opacity={0}
            />
        </mesh>
    );
};
