import React, { useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { useLoader, useFrame, useThree } from '@react-three/fiber';
import { useStore } from '../../store/useStore';

interface Background360Props {
    rotationSpeed?: number;
    showSphereFallback?: boolean;
}

export const Background360: React.FC<Background360Props> = ({
    rotationSpeed = 0.015,
}) => {
    const texture = useLoader(THREE.TextureLoader, '/fundo.jpeg');
    const { isCinematic } = useStore();
    const sphereRef = useRef<THREE.Mesh>(null);
    const { scene } = useThree();

    useLayoutEffect(() => {
        // eslint-disable-next-line
        texture.colorSpace = THREE.SRGBColorSpace;
        // eslint-disable-next-line
        texture.mapping = THREE.EquirectangularReflectionMapping;
    }, [texture]);

    // Apply texture to environment for lighting
    useLayoutEffect(() => {
        // eslint-disable-next-line
        scene.environment = texture;
        return () => {
            // eslint-disable-next-line
            scene.environment = null;
        };
    }, [scene, texture]);

    const materialRef = useRef<THREE.MeshBasicMaterial>(null);

    useFrame((state, delta) => {
        if (!texture || !sphereRef.current) return;

        // Manual Scene Background Cleanup
        if (state.scene.background) {
            state.scene.background = null;
        }

        const t = state.clock.elapsedTime;
        const currentSpeed = isCinematic ? rotationSpeed * 0.5 : rotationSpeed;
        const rotation = t * currentSpeed;

        sphereRef.current.rotation.y = rotation;
        sphereRef.current.position.set(0, 0, 0);

        // Rotate environment
        if ('environmentRotation' in scene) {
            // eslint-disable-next-line
            (scene as any).environmentRotation.y = rotation;
        }

        // Fade In
        if (materialRef.current) {
            materialRef.current.opacity = THREE.MathUtils.lerp(materialRef.current.opacity, 1, delta * 2.0);
        }
    });

    return (
        <mesh ref={sphereRef} scale={[-1, 1, 1]}>
            <sphereGeometry args={[500, 60, 40]} />
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
