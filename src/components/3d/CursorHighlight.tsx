import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';


interface CursorHighlightProps {
    position: THREE.Vector3;
    active: boolean;
}

export const CursorHighlight: React.FC<CursorHighlightProps> = ({ position, active }) => {
    const meshRef = useRef<THREE.Mesh>(null);
    const lightRef = useRef<THREE.PointLight>(null);

    useFrame((state) => {
        if (!meshRef.current || !active) return;

        // Gentle rotation
        meshRef.current.rotation.z += 0.02;

        // Pulse effect
        const scale = 1 + Math.sin(state.clock.elapsedTime * 4) * 0.1;
        meshRef.current.scale.set(scale, scale, scale);

        // Lerp position for smoothness
        meshRef.current.position.lerp(position, 0.2);
        if (lightRef.current) {
            lightRef.current.position.lerp(position, 0.2);
        }
    });

    if (!active) return null;

    return (
        <group>
            <mesh ref={meshRef} position={position}>
                <ringGeometry args={[0.3, 0.35, 32]} />
                <meshBasicMaterial color="#e9ce98" transparent opacity={0.6} side={THREE.DoubleSide} />
            </mesh>
            <pointLight ref={lightRef} position={position} distance={3} intensity={0.5} color="#e9ce98" />
        </group>
    );
};
