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
    const texture = useLoader(THREE.TextureLoader, '/fundo.png');
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

    useFrame((state) => {
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

        // Rotate environment to match sphere
        if ('environmentRotation' in scene) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            // eslint-disable-next-line
            (scene as any).environmentRotation.y = rotation;
        }
    });

    return (
        <mesh ref={sphereRef} scale={[-1, 1, 1]}>
            <sphereGeometry args={[500, 60, 40]} />
            <meshBasicMaterial
                map={texture}
                side={THREE.BackSide}
                toneMapped={false}
                fog={false}
            />
        </mesh>
    );
};
