import React, { useMemo, useRef, useLayoutEffect, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useLoader } from '@react-three/fiber';
import { generateProceduralTree } from '../../utils/treeGenerator';
import { soundManager } from '../../utils/SoundManager';
import type { EmotionData } from '../../types';

interface InstancedTreeProps {
    emotions: EmotionData[];
    onLeafClick: (emotion: EmotionData) => void;
    onLeafHover: (emotion: EmotionData | null, x: number, y: number) => void;
    onEmotionsUpdate?: (emotions: EmotionData[]) => void;
    reduceMotion: boolean;
    seed: number;
}

// Fibonacci Sphere Distribution (Hemisphere)
const getFibonacciPoints = (count: number, radius: number, yOffset: number) => {
    const points: THREE.Vector3[] = [];
    const phi = Math.PI * (3 - Math.sqrt(5)); // Golden Angle

    for (let i = 0; i < count; i++) {
        // y goes from 1 (top) to 0 (equator) for hemisphere
        const y = 1 - (i / (count - 1));  // 1 -> 0
        const r = Math.sqrt(1 - y * y); // Radius at y

        const theta = phi * i;

        const x = Math.cos(theta) * r * radius;
        const z = Math.sin(theta) * r * radius;
        const py = y * radius + yOffset; // Shift up

        points.push(new THREE.Vector3(x, py, z));
    }
    return points;
};

export const InstancedTree: React.FC<InstancedTreeProps> = ({ emotions, onLeafClick, onLeafHover, onEmotionsUpdate, reduceMotion, seed }) => {
    const leafMeshRef = useRef<THREE.InstancedMesh>(null);
    const branchMeshRef = useRef<THREE.InstancedMesh>(null);
    const haloRef = useRef<THREE.Mesh>(null);
    const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
    const [focusedIndex, setFocusedIndex] = React.useState<number>(0);
    const [leafMap] = useLoader(THREE.TextureLoader, ['/folha.png']);

    // --- CANVAS GENERATION (Branches) ---
    const { branches } = useMemo(() => {
        return generateProceduralTree(seed);
    }, [seed]);

    const branchTransforms = useMemo(() => {
        return branches.map(b => {
            const mat = new THREE.Matrix4();
            const midPoint = b.start.clone().add(b.end).multiplyScalar(0.5);
            const direction = b.end.clone().sub(b.start);
            const length = direction.length();
            const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
            mat.compose(midPoint, q, new THREE.Vector3(b.thickness, length, b.thickness));
            return mat;
        });
    }, [branches]);

    // --- LEAF DISTRIBUTION (DOME) ---
    const { allTransforms, emotionIndices } = useMemo(() => {
        const NATIVE_COUNT = 1500;
        const RADIUS = 16;
        const HEIGHT_OFFSET = 20;

        // 1. Native Leaves (Filler) - Inner/Dense
        const nativePoints = getFibonacciPoints(NATIVE_COUNT, RADIUS, HEIGHT_OFFSET);
        const transforms: THREE.Matrix4[] = [];

        nativePoints.forEach(pos => {
            // Add some jitter for organic look
            pos.x += (Math.random() - 0.5);
            pos.y += (Math.random() - 0.5) * 2;
            pos.z += (Math.random() - 0.5);

            const dummy = new THREE.Object3D();
            dummy.position.copy(pos);
            // Random rotation
            dummy.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
            dummy.scale.set(0, 0, 0); // Start scale 0 (animated)
            dummy.updateMatrix();
            transforms.push(dummy.matrix);
        });

        // 2. Emotion Leaves (Interactive) - Outer Layer
        // We place them slightly OUTSIDE the native radius to ensure visibility
        const eIndices = new Set<number>();
        const emotionTransforms: THREE.Matrix4[] = [];
        const EMOTION_RADIUS = RADIUS + 1.5; // Poke out

        emotions.forEach((emotion, i) => {
            // Category defines height bias
            let heightBias = 0;
            if (emotion.category === 'alegria' || emotion.category === 'amor') heightBias = 5;
            if (emotion.category === 'medo' || emotion.category === 'raiva') heightBias = -5;

            const y = 1 - (i / (emotions.length + 1));
            const r = Math.sqrt(1 - y * y);
            const theta = Math.PI * (3 - Math.sqrt(5)) * i * 10;

            const x = Math.cos(theta) * r * EMOTION_RADIUS;
            const z = Math.sin(theta) * r * EMOTION_RADIUS;
            const py = y * EMOTION_RADIUS + HEIGHT_OFFSET + heightBias;

            const pos = new THREE.Vector3(x, py, z);
            const dummy = new THREE.Object3D();
            dummy.position.copy(pos);

            dummy.rotation.set(Math.random() * Math.PI * 0.5, Math.atan2(x, z), 0);
            dummy.scale.set(0, 0, 0);
            dummy.updateMatrix();

            emotionTransforms.push(dummy.matrix);
            eIndices.add(transforms.length + i);
        });

        return { allTransforms: [...transforms, ...emotionTransforms], emotionIndices: eIndices };
    }, [emotions, seed]);


    // --- ANIMATION DELAYS ---
    const delays = useMemo(() => new Float32Array(allTransforms.length).map(() => Math.random() * 2.0), [allTransforms]);

    // --- SETUP COLORS ---
    useLayoutEffect(() => {
        if (leafMeshRef.current) {
            const updatedEmotions = [...emotions];
            let changed = false;

            allTransforms.forEach((mat, i) => {
                leafMeshRef.current!.setMatrixAt(i, mat);

                if (emotionIndices.has(i)) {
                    // Emotion: Vivid color from data
                    const idx = i - (allTransforms.length - emotions.length);
                    if (emotions[idx]) {
                        const c = new THREE.Color(emotions[idx].color).convertSRGBToLinear();
                        leafMeshRef.current!.setColorAt(i, c);

                        // Capture Position for Camera Focus
                        const pos = new THREE.Vector3();
                        const dummy = new THREE.Object3D();
                        dummy.matrix.copy(mat);
                        dummy.matrix.decompose(pos, dummy.quaternion, dummy.scale);

                        if (!updatedEmotions[idx].position ||
                            updatedEmotions[idx].position![0] !== pos.x ||
                            updatedEmotions[idx].position![1] !== pos.y ||
                            updatedEmotions[idx].position![2] !== pos.z) {
                            updatedEmotions[idx] = { ...updatedEmotions[idx], position: [pos.x, pos.y, pos.z] };
                            changed = true;
                        }
                    }
                } else {
                    // Native: Boho variations (Olive, Sage, Brown)
                    const rnd = Math.random();
                    let c;
                    if (rnd > 0.7) c = new THREE.Color('#8b5e3c'); // Dried Brown
                    else if (rnd > 0.4) c = new THREE.Color('#87A986'); // Sage
                    else c = new THREE.Color('#556b2f'); // Dark Olive

                    leafMeshRef.current!.setColorAt(i, c.convertSRGBToLinear());
                }
            });

            if (changed && onEmotionsUpdate) {
                onEmotionsUpdate(updatedEmotions);
            }

            leafMeshRef.current.instanceMatrix.needsUpdate = true;
            if (leafMeshRef.current.instanceColor) leafMeshRef.current.instanceColor.needsUpdate = true;

        }

        if (branchMeshRef.current) {
            branchTransforms.forEach((mat, i) => branchMeshRef.current!.setMatrixAt(i, mat));
            branchMeshRef.current.instanceMatrix.needsUpdate = true;
        }

    }, [allTransforms, emotionIndices, emotions, branchTransforms]);


    // --- FRAME LOOP ---
    const dummy = useMemo(() => new THREE.Object3D(), []);
    const startTime = useRef(0);
    useEffect(() => { startTime.current = Date.now(); }, [seed]);

    useFrame((state) => {
        if (!leafMeshRef.current) return;

        // Update Shader Time
        if (leafMeshRef.current.userData.shader) {
            leafMeshRef.current.userData.shader.uniforms.uTime.value = reduceMotion ? 0 : state.clock.elapsedTime;
        }

        const now = Date.now();
        const elapsedTotal = (now - startTime.current) / 1000;

        let needsUpdate = false;
        // Optimization: loop through 1500+ items is fine in JS
        for (let i = 0; i < allTransforms.length; i++) {
            if (elapsedTotal < delays[i]) continue;

            leafMeshRef.current.getMatrixAt(i, dummy.matrix);
            dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);

            const isEmotion = emotionIndices.has(i);
            const rnd = (i % 10) / 10;
            const baseNative = 1.0 + rnd * 0.5;

            let targetScale = baseNative;
            if (isEmotion) {
                const idx = i - (allTransforms.length - emotions.length);
                const intensity = emotions[idx]?.intensity || 3;
                targetScale = 1.5 + (intensity * 0.4); // 1.9 to 3.5
            }

            const dist = targetScale - dummy.scale.x;
            if (Math.abs(dist) > 0.01) {
                dummy.scale.addScalar(dist * 0.05); // Smooth grow
                needsUpdate = true;
            }

            // Simple Wind
            const wind = Math.sin(state.clock.elapsedTime + dummy.position.x * 0.5) * 0.005;
            dummy.rotation.z += wind;
            dummy.rotation.x += wind * 0.5;

            dummy.updateMatrix();
            leafMeshRef.current.setMatrixAt(i, dummy.matrix);
        }
        if (needsUpdate || true) leafMeshRef.current.instanceMatrix.needsUpdate = true;

        // Update Halo
        if (haloRef.current && (hoveredIndex !== null || focusedIndex !== null)) {
            const activeIdx = hoveredIndex !== null ? hoveredIndex : (allTransforms.length - emotions.length + focusedIndex);
            leafMeshRef.current.getMatrixAt(activeIdx, dummy.matrix);
            dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);

            haloRef.current.position.copy(dummy.position);
            haloRef.current.quaternion.copy(dummy.quaternion);
            haloRef.current.scale.copy(dummy.scale).multiplyScalar(1.2);
            haloRef.current.updateMatrix();
        }
    });

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                setFocusedIndex(prev => {
                    soundManager.playHover(0.3); // Soft sound on key nav
                    return (prev + 1) % emotions.length;
                });
            } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                setFocusedIndex(prev => {
                    soundManager.playHover(0.3);
                    return (prev - 1 + emotions.length) % emotions.length;
                });
            } else if (e.key === 'Enter') {
                soundManager.playClick();
                onLeafClick(emotions[focusedIndex]);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [emotions, focusedIndex, onLeafClick]);

    const handlePointerMove = (e: any) => {
        e.stopPropagation();
        const id = e.instanceId!;
        if (emotionIndices.has(id)) {
            document.body.style.cursor = 'pointer';
            if (hoveredIndex !== id) {
                setHoveredIndex(id);
                // Trigger sound only on new hover
                soundManager.playHover();
                const idx = id - (allTransforms.length - emotions.length);
                onLeafHover(emotions[idx], e.clientX, e.clientY);
            }
        } else {
            handlePointerOut();
        }
    };

    const handlePointerOut = () => {
        document.body.style.cursor = 'auto';
        setHoveredIndex(null);
        onLeafHover(null, 0, 0);
    };

    return (
        <group>
            <instancedMesh
                ref={branchMeshRef}
                args={[undefined, undefined, branchTransforms.length]}
                castShadow
                receiveShadow
            >
                <cylinderGeometry args={[0.3, 0.4, 1, 5]} />
                <meshStandardMaterial color="#3E3228" roughness={0.9} />
            </instancedMesh>

            <instancedMesh
                ref={leafMeshRef}
                args={[undefined, undefined, allTransforms.length]}
                castShadow
                receiveShadow
                onPointerMove={handlePointerMove}
                onPointerOut={handlePointerOut}
                onClick={(e) => {
                    e.stopPropagation();
                    const id = e.instanceId!;
                    if (emotionIndices.has(id)) {
                        soundManager.playClick();
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
                    alphaTest={0.3}
                />
            </instancedMesh>

            <mesh ref={haloRef} visible={hoveredIndex !== null}>
                <planeGeometry args={[1, 1]} />
                <meshStandardMaterial
                    color="white"
                    emissive="white"
                    emissiveIntensity={1.5}
                    transparent
                    opacity={0.3}
                    depthTest={false}
                    side={THREE.DoubleSide}
                />
            </mesh>
        </group>
    );
};
