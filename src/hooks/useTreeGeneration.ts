import { useMemo } from 'react';
import * as THREE from 'three';
import { generateProceduralTree } from '../utils/treeGenerator';
import { createRng } from '../utils/random';
import type { EmotionData } from '../types';
import { TREE_CONSTANTS } from '../constants/3d';

export interface TreeGenerationResult {
    branches: any[];
    simpleLeaves: THREE.Matrix4[];
    messageGroups: {
        transforms: THREE.Matrix4[];
        originalIndices: number[];
    }[];
    instanceLookup: number[][];
}

export const useTreeGeneration = (seed: number, emotions: EmotionData[]): TreeGenerationResult => {
    return useMemo(() => {
        // 1. Generate Skeleton
        const treeData = generateProceduralTree(seed);

        // 2. Partition Leaves (90% Simple, 10% Message)
        const rng = createRng(seed);
        const totalAnchors = treeData.leafAnchors.length;

        // Shuffle anchors to distribute message leaves randomly
        const indices = Array.from({ length: totalAnchors }, (_, i) => i);
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }

        const messageCount = Math.ceil(totalAnchors * 0.1);
        const messageIndices = new Set(indices.slice(0, messageCount));

        const sLeaves: THREE.Matrix4[] = [];
        const mGroups = Array.from({ length: 5 }, () => ({
            transforms: [] as THREE.Matrix4[],
            originalIndices: [] as number[]
        }));

        const emotionCount = emotions.length;
        const dummy = new THREE.Object3D();

        treeData.leafAnchors.forEach((anchorMat, i) => {
            anchorMat.decompose(dummy.position, dummy.quaternion, dummy.scale);

            if (messageIndices.has(i)) {
                // MESSAGE LEAF (10%)
                const emIdx = mGroups.reduce((acc, g) => acc + g.transforms.length, 0) % Math.max(1, emotionCount);
                const em = emotions[emIdx];

                // Scale using constants
                dummy.scale.setScalar(TREE_CONSTANTS.LEAF.MESSAGE_SCALE_FACTOR);
                dummy.updateMatrix();

                // Determine texture index based on URL or randomness
                let texIdx = 0;
                if (em?.textureUrl) {
                    const match = em.textureUrl.match(/_0?(\d)\.(png|jpg|jpeg)$/i);
                    if (match) texIdx = Math.max(0, Math.min(4, parseInt(match[1]) - 1));
                } else {
                    texIdx = Math.floor(rng() * 5);
                }

                mGroups[texIdx].transforms.push(dummy.matrix.clone());
                mGroups[texIdx].originalIndices.push(emIdx);
            } else {
                // SIMPLE LEAF (90%)
                // Scale variation
                dummy.scale.setScalar(0.8 + rng() * 0.2);
                dummy.updateMatrix();
                sLeaves.push(dummy.matrix.clone());
            }
        });

        return {
            branches: treeData.branches,
            simpleLeaves: sLeaves,
            messageGroups: mGroups,
            instanceLookup: mGroups.map(g => g.originalIndices)
        };
    }, [seed, emotions]);
};
