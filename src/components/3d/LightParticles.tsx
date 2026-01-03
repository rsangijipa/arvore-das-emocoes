import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../../store/useStore';
import { createRng } from '../../utils/random';

export const LightParticles: React.FC = () => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const count = 300;
    const { seed } = useStore();

    // Fix Bug #4: Deterministic RNG
    const randomFor = useMemo(() => createRng(seed * 4421), [seed]);

    // Initial random positions
    const initialPositions = useMemo(() => {
        const rng = randomFor; // local alias
        const arr = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
            arr[i * 3] = (rng() - 0.5) * 60;
            arr[i * 3 + 1] = rng() * 40;
            arr[i * 3 + 2] = (rng() - 0.5) * 60;
        }
        return arr;
    }, [count, randomFor]);

    // Random speeds
    const speeds = useMemo(() => {
        const rng = randomFor;
        // Need to advance/fork rng or just loop? 
        // createRng returns a function that updates state, so reusing it continues sequence. 
        // But useMemo might run twice. 'randomFor' instance is stable per seed.
        return new Float32Array(count).map(() => 0.2 + rng() * 0.5);
    }, [count, randomFor]);

    const dummy = useMemo(() => new THREE.Object3D(), []);

    useFrame((state) => {
        if (!meshRef.current) return;

        // Simple CPU animation (drifting down/around)
        // For 300 particles, CPU is cheaper than setting up custom shader material boilerplate
        // unless we really want fancy noise.
        const t = state.clock.elapsedTime;

        for (let i = 0; i < count; i++) {
            let x = initialPositions[i * 3];
            let y = initialPositions[i * 3 + 1];
            let z = initialPositions[i * 3 + 2];

            // Animate
            const speed = speeds[i];
            y -= t * speed * 2.0;

            // Wrap around (0 to 40 height)
            y = ((y % 40) + 40) % 40;

            // Wiggle
            x += Math.sin(t * 0.5 + i) * 2;
            z += Math.cos(t * 0.3 + i) * 2;

            dummy.position.set(x, y, z);
            dummy.scale.setScalar(Math.sin(t * 2 + i) * 0.05 + 0.1); // Twinkle size
            dummy.rotation.set(t, t, t);
            dummy.updateMatrix();

            meshRef.current.setMatrixAt(i, dummy.matrix);
        }

        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
            <dodecahedronGeometry args={[0.2, 0]} />
            <meshBasicMaterial
                color="#fffceb"
                transparent
                opacity={0.6}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </instancedMesh>
    );
};
