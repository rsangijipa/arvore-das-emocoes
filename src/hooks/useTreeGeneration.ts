import { useMemo } from 'react';
import * as THREE from 'three';
import { FractalTreeGenerator, type TreeSegment } from '../components/3d/tree/FractalTreeGenerator';
import type { EmotionData } from '../types';

export interface TreeGenerationResult {
    branches: TreeSegment[];
    simpleLeaves: THREE.Matrix4[];
    messageGroups: {
        transforms: THREE.Matrix4[];
        originalIndices: number[];
    }[];
    instanceLookup: number[][];
}

export const useTreeGeneration = (seed: number, emotions: EmotionData[]): TreeGenerationResult => {
    return useMemo(() => {
        // 1. Generate Skeleton & Leaves
        const generator = new FractalTreeGenerator(seed);
        const skeleton = generator.generate(6); // Max Depth

        // 2. Separate Leaves
        const sLeaves: THREE.Matrix4[] = [];
        const mGroups = Array.from({ length: 5 }, () => ({
            transforms: [] as THREE.Matrix4[],
            originalIndices: [] as number[]
        }));

        const emotionCount = emotions.length || 1;
        const dummy = new THREE.Object3D();

        skeleton.leafPoints.forEach((lp) => {
            dummy.position.copy(lp.position);
            dummy.quaternion.copy(lp.rotation);
            dummy.scale.setScalar(lp.scale);
            dummy.updateMatrix();

            if (lp.type === 'message') {
                // Distribute across 5 textures
                // Use position hash for determinism
                const hash = Math.floor(Math.abs(lp.position.x * 137 + lp.position.y * 149 + lp.position.z * 163));
                const texIdx = hash % 5;

                // Distribute across emotions
                const emIdx = hash % emotionCount;

                mGroups[texIdx].transforms.push(dummy.matrix.clone());
                mGroups[texIdx].originalIndices.push(emIdx);
            } else {
                sLeaves.push(dummy.matrix.clone());
            }
        });

        return {
            branches: skeleton.segments,
            simpleLeaves: sLeaves,
            messageGroups: mGroups,
            instanceLookup: mGroups.map(g => g.originalIndices)
        };
    }, [seed, emotions]);
};
