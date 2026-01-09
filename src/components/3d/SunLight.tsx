import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';

export const SunLight: React.FC = () => {
    const lightRef = useRef<THREE.DirectionalLight>(null);
    const isMobile = useStore(state => state.deviceInfo.isMobile);
    const reduceMotion = useStore(state => state.reduceMotion);

    // Performance Mode ON = reduceMotion TRUE = Shadows OFF
    // Mobile = Shadows OFF (Safety net)
    const castShadow = !reduceMotion && !isMobile;

    useFrame((state) => {
        if (lightRef.current) {
            const t = state.clock.elapsedTime * 0.1; // Slightly faster cycle

            // Movement
            lightRef.current.position.x = 20 + Math.sin(t) * 10;
            lightRef.current.position.z = 20 + Math.cos(t) * 10;

            // Dynamic Color Cycling (Golden Hour <-> High Noon)
            // Sin wave -1 to 1. Map to 0 to 1 for interpolation.
            const dayCycle = (Math.sin(t * 0.5) + 1) / 2;

            const colorA = new THREE.Color("#e9ce98"); // Golden Amber
            const colorB = new THREE.Color("#fffee0"); // Bright White-Yellow

            const finalColor = colorA.lerp(colorB, dayCycle);
            lightRef.current.color = finalColor;
        }
    });

    return (
        <directionalLight
            ref={lightRef}
            position={[20, 50, 20]}
            intensity={1.8}
            castShadow={castShadow}
            shadow-mapSize={[512, 512]}
            shadow-bias={-0.0002}
            shadow-radius={3}
            color="#e9ce98"
        />
    );
};
