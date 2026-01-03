import React from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CameraRigProps {
    targetPosition?: [number, number, number];
}

export const CameraRig: React.FC<CameraRigProps> = ({ targetPosition }) => {
    // const { camera } = useThree(); // Removed unused
    // const vec = new THREE.Vector3(); // Removed unused

    useFrame((state, delta) => {
        if (!targetPosition) return;

        // Target location: slightly in front of the leaf
        const [tx, ty, tz] = targetPosition;
        const targetPos = new THREE.Vector3(tx, ty, tz);

        // Calculate ideal camera position (offset from target)
        // We want to be close but looking at it. 
        // Let's assume we want to be +10 units in Z relative to the leaf, or along the vector from origin.
        // A simple approach: Normalize the vector from origin to target, and back up a bit.
        // const direction = targetPos.clone().normalize(); // Removed unused
        // We might want to look slightly down or vary based on height
        const idealPos = targetPos.clone().add(new THREE.Vector3(0, 0, 15)); // Fixed offset for now for simplicity, or relative

        // Smoothly interpolate camera position
        state.camera.position.lerp(idealPos, 2.5 * delta);

        // Smoothly interpolate lookAt
        // We can't directly lerp lookAt, so we use a dummy target
        // But OrbitControls might have set a target. 
        // Since OrbitControls is disabled, we can manually control lookAt.
        state.camera.lookAt(targetPos);
    });

    return null;
};
