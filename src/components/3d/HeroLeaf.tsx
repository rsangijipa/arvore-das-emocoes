import React, { useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useTexture } from '@react-three/drei';
import { useStore } from '../../store/useStore';

export const HeroLeaf: React.FC = () => {
    const focusedLeaf = useStore(state => state.focusedLeaf);
    const meshRef = useRef<THREE.Mesh>(null);
    const { camera } = useThree();

    // Load geometry again (cached)
    const { scene: glbScene } = useGLTF("/folha.glb");
    const geometry = React.useMemo(() => {
        let geom: THREE.BufferGeometry | null = null;
        glbScene.traverse((obj) => {
            if ((obj as THREE.Mesh).isMesh && !geom) {
                geom = (obj as THREE.Mesh).geometry.clone();
                geom.center();
            }
        });
        return geom || new THREE.PlaneGeometry(1, 1);
    }, [glbScene]);

    // Material (Re-use logic would be better, but simpler to recreate standard one here for now)
    // In a production app context, we would pass materials via context or props
    const material = React.useMemo(() => {
        // Simple leaf material matching the instanced ones roughly
        // We can optimize this later to pull exact texture from the focusedLeaf.textureIndex
        return new THREE.MeshStandardMaterial({
            color: '#ffffff',
            roughness: 0.6,
            metalness: 0.1,
            side: THREE.DoubleSide
            // We will map texture dynamically below or need to load it here
        });
    }, []);

    // Load all textures similarly to InstancedTree to hit cache
    const textureUrls = [
        '/textures/leaves/leaf_tex_01.jpg',
        '/textures/leaves/leaf_tex_02.jpg',
        '/textures/leaves/leaf_tex_03.jpg',
        '/textures/leaves/leaf_tex_04.jpg',
        '/textures/leaves/leaf_tex_05.jpg'
    ];
    // This hook suspends, but since they are preloaded in parent, it should be instant
    const textures = useTexture(textureUrls);

    // Re-create material with correct map
    useLayoutEffect(() => {
        if (meshRef.current && focusedLeaf) {
            const tex = textures[focusedLeaf.textureIndex] || textures[0];
            // Clone texture to avoid modifying hook return value
            const textureClone = tex.clone();
            textureClone.colorSpace = THREE.SRGBColorSpace;
            textureClone.flipY = false; // Match standard GLB orientation if needed

            // Apply to material
            if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
                meshRef.current.material.map = textureClone;
                meshRef.current.material.needsUpdate = true;
            }
        }
    }, [focusedLeaf, textures]);

    useFrame((_, delta) => {
        if (!focusedLeaf || !meshRef.current) return;

        // Smooth animation with easing
        const animationSpeed = 3.5 * delta; // Slightly slower for smoother feel
        const scaleSpeed = 3.0 * delta;

        // Target Position Calculation (Screen Space -> World Space)
        // Position on left side of screen for message card visibility
        const targetNDC = new THREE.Vector3(-0.25, -0.10, 0.5);

        // Unproject to world
        targetNDC.unproject(camera);
        const dir = targetNDC.sub(camera.position).normalize();
        const distance = 2.0; // Fixed key distance
        const targetPos = camera.position.clone().add(dir.multiplyScalar(distance));

        // Target Rotation (Face camera nicely with gentle tilt)
        const targetQuat = camera.quaternion.clone();
        const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.4, 0, 0.15));
        targetQuat.multiply(tilt);

        // Smooth position animation with easing
        const currentPos = meshRef.current.position;
        const posDiff = targetPos.clone().sub(currentPos);
        const easedSpeed = 1 - Math.pow(1 - animationSpeed, 3); // Ease-out cubic
        currentPos.add(posDiff.multiplyScalar(easedSpeed));
        meshRef.current.position.copy(currentPos);

        // Smooth rotation
        meshRef.current.quaternion.slerp(targetQuat, animationSpeed);

        // Smooth scale animation
        const targetScale = new THREE.Vector3(0.5, 0.5, 0.5);
        const currentScale = meshRef.current.scale;
        const scaleDiff = targetScale.clone().sub(currentScale);
        const easedScaleSpeed = 1 - Math.pow(1 - scaleSpeed, 3);
        currentScale.add(scaleDiff.multiplyScalar(easedScaleSpeed));
        meshRef.current.scale.copy(currentScale);
    });

    useLayoutEffect(() => {
        if (focusedLeaf && meshRef.current) {
            // Set initial state to match the instance with smooth transition
            const mat = focusedLeaf.matrix;
            const pos = new THREE.Vector3();
            const quat = new THREE.Quaternion();
            const scale = new THREE.Vector3();
            mat.decompose(pos, quat, scale);

            // Start from original position for smooth animation
            meshRef.current.position.copy(pos);
            meshRef.current.quaternion.copy(quat);
            meshRef.current.scale.copy(scale);
            
            // Small initial scale boost for visual feedback
            meshRef.current.scale.multiplyScalar(1.1);
        }
    }, [focusedLeaf]);

    if (!focusedLeaf) return null;

    return (
        <mesh
            ref={meshRef}
            geometry={geometry}
            material={material}
        />
    );
};
