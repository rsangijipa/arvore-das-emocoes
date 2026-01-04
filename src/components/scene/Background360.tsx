import React, { useRef, useLayoutEffect } from 'react';
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
    const optimizedTexture = React.useMemo(() => {
        const baseTexture = deviceInfo.isMobile ? texture.clone() : texture;
        
        // Configure texture properties in the memo
        baseTexture.colorSpace = THREE.SRGBColorSpace;
        baseTexture.mapping = THREE.EquirectangularReflectionMapping;
        
        if (deviceInfo.isMobile) {
            baseTexture.minFilter = THREE.LinearFilter;
            baseTexture.magFilter = THREE.LinearFilter;
            baseTexture.generateMipmaps = false;
        }
        
        return baseTexture;
    }, [texture, deviceInfo.isMobile]);

    // Apply texture to environment for lighting
    useLayoutEffect(() => {
        // Scene from useThree is safe to modify in effects
        scene.environment = optimizedTexture;
        return () => {
            scene.environment = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [optimizedTexture]);

    const materialRef = useRef<THREE.MeshBasicMaterial>(null);

    useFrame((state, delta) => {
        if (!optimizedTexture || !sphereRef.current) return;

        // Manual Scene Background Cleanup (state.scene is safe to modify in useFrame)
        if (state.scene.background) {
            state.scene.background = null;
        }

        // Static background - no rotation
        sphereRef.current.rotation.y = 0;
        sphereRef.current.position.set(0, 0, 0);

        // Keep environment static
        const sceneWithRotation = scene as typeof scene & { environmentRotation?: { y: number } };
        if (sceneWithRotation.environmentRotation) {
            sceneWithRotation.environmentRotation.y = 0;
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
