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
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.flipY = false; // Match standard GLB orientation if needed

            // Apply to material
            if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
                meshRef.current.material.map = tex;
                meshRef.current.material.needsUpdate = true;
            }
        }
    }, [focusedLeaf, textures]);

    useFrame((_, delta) => {
        if (!focusedLeaf || !meshRef.current) return;

        // Target Position Calculation (Screen Space -> World Space)
        // We want it ~40% left (-0.2 NDC X?)
        // Let's aim for NDC: x = -0.25, y = 0
        const targetNDC = new THREE.Vector3(-0.25, -0.10, 0.5);

        // Unproject to world
        targetNDC.unproject(camera);
        const dir = targetNDC.sub(camera.position).normalize();
        const distance = 2.0; // Fixed key distance
        const targetPos = camera.position.clone().add(dir.multiplyScalar(distance));

        // Target Rotation (Face camera nicely)
        const targetQuat = camera.quaternion.clone();
        // Maybe tilt it a bit
        const tilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.5, 0, 0.2));
        targetQuat.multiply(tilt);

        // Animation (Lerp)
        const speed = 4.0 * delta;
        meshRef.current.position.lerp(targetPos, speed);
        meshRef.current.quaternion.slerp(targetQuat, speed);
        meshRef.current.scale.lerp(new THREE.Vector3(0.5, 0.5, 0.5), speed); // Scale up/down to be consistent size
    });

    useLayoutEffect(() => {
        if (focusedLeaf && meshRef.current) {
            // Set initial state to match the instance
            const mat = focusedLeaf.matrix;
            const pos = new THREE.Vector3();
            const quat = new THREE.Quaternion();
            const scale = new THREE.Vector3();
            mat.decompose(pos, quat, scale);

            meshRef.current.position.copy(pos);
            meshRef.current.quaternion.copy(quat);
            meshRef.current.scale.copy(scale);
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
