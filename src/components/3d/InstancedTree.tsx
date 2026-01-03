import React, { useMemo, useRef, useLayoutEffect, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useLoader } from '@react-three/fiber';
import { generateProceduralTree } from '../../utils/treeGenerator';
import type { EmotionData } from '../../types';

interface InstancedTreeProps {
    emotions: EmotionData[];
    onLeafClick: (emotion: EmotionData) => void;
    seed: number;
}

export const InstancedTree: React.FC<InstancedTreeProps> = ({ emotions, onLeafClick, seed }) => {
    const leafMeshRef = useRef<THREE.InstancedMesh>(null);
    const branchMeshRef = useRef<THREE.InstancedMesh>(null);
    const [leafMap] = useLoader(THREE.TextureLoader, ['/folha.png']);

    // --- PROCEDURAL GENERATION ---
    const { leafPositions, branches } = useMemo(() => {
        return generateProceduralTree(seed);
    }, [seed]);

    // Prepare Branch Instances
    const branchTransforms = useMemo(() => {
        return branches.map(b => {
            const mat = new THREE.Matrix4();
            const midPoint = b.start.clone().add(b.end).multiplyScalar(0.5);
            const direction = b.end.clone().sub(b.start);
            const length = direction.length();

            // Quaternion from up vector (0,1,0) to direction
            const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());

            // Scale: x/z = thickness, y = length
            mat.compose(midPoint, q, new THREE.Vector3(b.thickness, length, b.thickness));
            return mat;
        });
    }, [branches]);

    const { allTransforms, emotionIndices } = useMemo(() => {
        // ... (Same logic as before for mixing leaves)
        const transforms = [...leafPositions];
        const eIndices = new Set<number>();
        const emotionTransforms: THREE.Matrix4[] = [];
        emotions.forEach((_, i) => {
            const angle = (i / emotions.length) * Math.PI * 2;
            const r = 14 + Math.random() * 4;
            const h = 22 + Math.random() * 8;
            const pos = new THREE.Vector3(Math.cos(angle) * r, h, Math.sin(angle) * r);
            const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -angle, 0));
            const mat = new THREE.Matrix4().compose(pos, q, new THREE.Vector3(0, 0, 0));
            emotionTransforms.push(mat);
            eIndices.add(transforms.length + i);
        });
        return { allTransforms: [...transforms, ...emotionTransforms], emotionIndices: eIndices };
    }, [leafPositions, emotions]);


    // --- ANIMATION STATE ---
    const delays = useMemo(() => new Float32Array(allTransforms.length).map(() => Math.random() * 1.5), [allTransforms]);

    // --- SETUP INSTANCES ---
    useLayoutEffect(() => {
        // Leaves Setup
        if (leafMeshRef.current) {
            allTransforms.forEach((mat, i) => {
                leafMeshRef.current!.setMatrixAt(i, mat);
                if (emotionIndices.has(i)) {
                    const idx = i - (allTransforms.length - emotions.length);
                    if (emotions[idx]) {
                        const c = new THREE.Color(emotions[idx].color).convertSRGBToLinear();
                        leafMeshRef.current!.setColorAt(i, c);
                    }
                } else {
                    // Boho Native Leaves: Olive/Sage greens
                    // 60% Olive, 40% Dried (Brownish)
                    const isDried = Math.random() > 0.8;
                    const c = isDried
                        ? new THREE.Color('#8b5e3c').convertSRGBToLinear() // Brown
                        : new THREE.Color().setHSL(0.25 + Math.random() * 0.05, 0.4, 0.2 + Math.random() * 0.2); // Olive
                    leafMeshRef.current!.setColorAt(i, c);
                }
            });
            leafMeshRef.current.instanceMatrix.needsUpdate = true;
            if (leafMeshRef.current.instanceColor) leafMeshRef.current.instanceColor.needsUpdate = true;
        }

        // Branches Setup
        if (branchMeshRef.current) {
            branchTransforms.forEach((mat, i) => {
                branchMeshRef.current!.setMatrixAt(i, mat);
            });
            branchMeshRef.current.instanceMatrix.needsUpdate = true;
        }

    }, [allTransforms, emotionIndices, emotions, branchTransforms]);


    // --- ANIMATION LOOP ---
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const startTime = useRef(0);
    useEffect(() => { startTime.current = Date.now(); }, [seed]);

    useFrame((state) => {
        if (!leafMeshRef.current) return;
        const now = Date.now();
        const elapsedTotal = (now - startTime.current) / 1000;

        let needsUpdate = false;
        for (let i = 0; i < allTransforms.length; i++) {
            if (elapsedTotal < delays[i]) continue;

            leafMeshRef.current.getMatrixAt(i, dummy.matrix);
            dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);

            const isEmotion = emotionIndices.has(i);
            const targetScale = isEmotion ? 3.5 : 1.8;

            const dist = targetScale - dummy.scale.x;
            if (Math.abs(dist) > 0.01) {
                dummy.scale.addScalar(dist * 0.08);
                needsUpdate = true;
            }

            const wind = Math.sin(state.clock.elapsedTime * 1.5 + dummy.position.x) * 0.003;
            dummy.rotation.z += wind;
            dummy.rotation.x += wind * 0.5;

            dummy.updateMatrix();
            leafMeshRef.current.setMatrixAt(i, dummy.matrix);
        }
        if (needsUpdate || true) leafMeshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <group>
            {/* Branches Instanced */}
            <instancedMesh
                ref={branchMeshRef}
                args={[undefined, undefined, branchTransforms.length]}
                castShadow
                receiveShadow
            >
                <cylinderGeometry args={[0.5, 0.5, 1, 6]} /> {/* Normalized geometry, scaled by instance */}
                <meshStandardMaterial
                    color="#4a3728" // Deep Cocoa
                    roughness={0.9}
                    side={THREE.DoubleSide}
                />
            </instancedMesh>

            {/* Leaves Instanced */}
            <instancedMesh
                ref={leafMeshRef}
                args={[undefined, undefined, allTransforms.length]}
                castShadow
                receiveShadow
                onPointerMove={(e) => {
                    if (emotionIndices.has(e.instanceId!)) document.body.style.cursor = 'pointer';
                }}
                onPointerOut={() => document.body.style.cursor = 'auto'}
                onClick={(e) => {
                    e.stopPropagation();
                    const id = e.instanceId!;
                    if (emotionIndices.has(id)) {
                        const idx = id - (allTransforms.length - emotions.length);
                        onLeafClick(emotions[idx]);
                    }
                }}
            >
                <planeGeometry args={[1, 1]} />
                <meshStandardMaterial
                    map={leafMap}
                    transparent
                    side={THREE.DoubleSide}
                    alphaTest={0.4}
                />
            </instancedMesh>
        </group>
    );
};
