import React, { useMemo, useRef, useLayoutEffect, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useLoader, type ThreeEvent } from '@react-three/fiber';
import { generateProceduralTree } from '../../utils/treeGenerator';
import { soundManager } from '../../utils/SoundManager';
import type { EmotionData } from '../../types';
import { createRng } from '../../utils/random';

interface InstancedTreeProps {
    emotions: EmotionData[];
    onLeafClick: (emotion: EmotionData) => void;
    onLeafHover: (emotion: EmotionData | null, x: number, y: number) => void;
    onEmotionsUpdate?: (emotions: EmotionData[]) => void;
    reduceMotion: boolean;
    seed: number;
    isCinematic: boolean;
    windLevel: 'Off' | 'Calm' | 'Breezy';
    isPaused: boolean;
}

// Ellipsoid Distribution (Canopy)
const getCanopyPoints = (count: number, radiusX: number, radiusY: number, yOffset: number) => {
    const points: THREE.Vector3[] = [];
    const minRadiusSq = 0.3 * 0.3; // Hollow center percentage squared

    let attempts = 0;
    while (points.length < count && attempts < count * 5) {
        attempts++;
        // Random point in unit sphere
        const u = Math.random();
        const v = Math.random();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);

        const r = Math.cbrt(Math.random()); // Cube root for uniform distribution

        // Convert to Cartesian
        const sinPhi = Math.sin(phi);
        const xNormalized = r * sinPhi * Math.cos(theta);
        const yNormalized = r * sinPhi * Math.sin(theta);
        const zNormalized = r * Math.cos(phi);

        // Check bounds (Hollow shell: 0.4 to 1.0)
        const distSq = xNormalized * xNormalized + yNormalized * yNormalized + zNormalized * zNormalized;

        // We want a shell, mostly upper hemisphere?
        // Let's force y to be mostly positive? yNormalized goes -1 to 1.
        // Let's shift it up.

        if (distSq < minRadiusSq) continue;

        // Shape into ellipsoid
        const x = xNormalized * radiusX;
        const y = Math.abs(yNormalized) * radiusY + yOffset; // Abs(y) for upper dome, + offset
        const z = zNormalized * radiusX;

        points.push(new THREE.Vector3(x, y, z));
    }
    return points;
};

export const InstancedTree: React.FC<InstancedTreeProps> = ({ emotions, onLeafClick, onLeafHover, onEmotionsUpdate, reduceMotion, seed, isCinematic, windLevel, isPaused }) => {
    const leafMeshRef = useRef<THREE.InstancedMesh>(null);
    const branchMeshRef = useRef<THREE.InstancedMesh>(null);
    const haloRef = useRef<THREE.Mesh>(null);
    const [hoveredIndex, setHoveredIndex] = React.useState<number | null>(null);
    const [focusedIndex, setFocusedIndex] = React.useState<number>(0);
    const [leafMap] = useLoader(THREE.TextureLoader, ['/folha.png']);
    const [cursorPointer, setCursorPointer] = useState(false);

    // Track current scales for animation
    const scalesRef = useRef<Float32Array | null>(null);

    useEffect(() => {
        document.body.style.cursor = cursorPointer ? 'pointer' : 'auto';
        return () => {
            document.body.style.cursor = 'auto';
        };
    }, [cursorPointer]);

    const randomFor = useMemo(() => (offset: number) => createRng(Math.floor(seed * 9973 + offset)), [seed]);

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

    // --- LEAF DISTRIBUTION (Canopy) ---
    const { allTransforms, emotionIndices } = useMemo(() => {
        const NATIVE_COUNT = 1500;
        const RADIUS_X = 18;
        const RADIUS_Y = 14;
        const HEIGHT_OFFSET = 18;

        const jitterRng = randomFor(1);

        // 1. Native Leaves (Filler)
        const nativePoints = getCanopyPoints(NATIVE_COUNT, RADIUS_X, RADIUS_Y, HEIGHT_OFFSET);
        const transforms: THREE.Matrix4[] = [];

        nativePoints.forEach(pos => {
            // Slight noise
            pos.x += (jitterRng() - 0.5) * 2;
            pos.y += (jitterRng() - 0.5) * 2;
            pos.z += (jitterRng() - 0.5) * 2;

            const dummy = new THREE.Object3D();
            dummy.position.copy(pos);
            // Random rotation
            dummy.rotation.set(jitterRng() * Math.PI, jitterRng() * Math.PI, jitterRng() * Math.PI);

            // Native Scale: 0.6 - 1.2
            const s = 0.6 + jitterRng() * 0.6;
            dummy.userData = { targetScale: s }; // Store target scale in userData hack directly on object? No, Matrix doesn't store userData.
            // We'll recover target scale from index later or deterministic RNG? 
            // Better: use the matrix scale to store TARGET scale, and animate from 0 separately?
            // Actually, let's store Scale 1 in matrix, and apply multiplier in loop.
            dummy.scale.set(1, 1, 1);

            dummy.updateMatrix();
            transforms.push(dummy.matrix);
        });

        // 2. Emotion Leaves (Interactive)
        const eIndices = new Set<number>();
        const emotionTransforms: THREE.Matrix4[] = [];
        const EMOTION_RADIUS_X = RADIUS_X + 2;

        emotions.forEach((emotion, i) => {
            let heightBias = 0;
            if (emotion.category === 'alegria' || emotion.category === 'amor') heightBias = 6;
            if (emotion.category === 'medo' || emotion.category === 'tristeza') heightBias = -4;

            // Simple distribution on surface
            const theta = (i / emotions.length) * Math.PI * 2 * 3; //Wrap around 3 times
            const yNorm = (i / emotions.length) * 2 - 1;
            const phi = Math.acos(yNorm * 0.8); // 0.8 to compress vertically

            const x = Math.sin(phi) * Math.cos(theta) * EMOTION_RADIUS_X;
            const z = Math.sin(phi) * Math.sin(theta) * EMOTION_RADIUS_X;
            const y = Math.cos(phi) * RADIUS_Y + HEIGHT_OFFSET + heightBias;

            const pos = new THREE.Vector3(x, y, z);
            const dummy = new THREE.Object3D();
            dummy.position.copy(pos);
            dummy.lookAt(0, HEIGHT_OFFSET + 10, 0); // Look at centerish

            // Emotion Scale: 1.4 - 1.8 linked to intensity
            const intensity = emotion.intensity || 3;
            const s = 1.4 + (intensity / 5) * 0.4;

            // Store target scale in the matrix scale/elements for now? 
            // We will stash it in a separate array or property? 
            // Let's just put it in Scale X/Y/Z of the matrix. 
            // In the loop, we will animate FROM current to target.
            dummy.scale.set(s, s, s);

            dummy.updateMatrix();

            emotionTransforms.push(dummy.matrix);
            eIndices.add(transforms.length + i);
        });

        return { allTransforms: [...transforms, ...emotionTransforms], emotionIndices: eIndices };
    }, [emotions, randomFor]);


    // --- ANIMATION DELAYS & SCALES INIT ---
    const { delays, targetScales } = useMemo(() => {
        const delayRng = randomFor(3);
        const d = new Float32Array(allTransforms.length);
        const t = new Float32Array(allTransforms.length);

        const dummy = new THREE.Object3D();

        allTransforms.forEach((m, i) => {
            d[i] = delayRng() * 2.0;

            // Extract scale from matrix to use as target
            dummy.matrix.copy(m);
            dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
            t[i] = dummy.scale.x; // Uniform scale assumed
        });

        return { delays: d, targetScales: t };
    }, [allTransforms, randomFor]);

    // Initialize/Reset ScalesRef
    useEffect(() => {
        scalesRef.current = new Float32Array(allTransforms.length).fill(0);
    }, [allTransforms]);


    // --- SETUP COLORS ---
    useLayoutEffect(() => {
        if (leafMeshRef.current) {
            const updatedEmotions = [...emotions];
            let changed = false;
            const colorRng = randomFor(4);

            allTransforms.forEach((mat, i) => {
                // Set matrix with Scale=0 initially (via animation loop) or here?
                // The loop handles everything. But we need to set colors.
                // We shouldn't touch matrix here if loop does it. 
                // But loop needs base transforms without scale 0? 
                // wait, loop uses allTransforms which HAS target scale. 
                // loop sets scale.

                if (emotionIndices.has(i)) {
                    const idx = i - (allTransforms.length - emotions.length);
                    if (emotions[idx]) {
                        const c = new THREE.Color(emotions[idx].color).convertSRGBToLinear();
                        leafMeshRef.current!.setColorAt(i, c);

                        // Capture Position for Camera Focus (Decompose from BASE mat)
                        const pos = new THREE.Vector3();
                        const dummy = new THREE.Object3D();
                        dummy.matrix.copy(mat); // This mat has Target Scale, but correct Pos/Rot
                        dummy.matrix.decompose(pos, dummy.quaternion, dummy.scale);

                        if (!updatedEmotions[idx].position ||
                            updatedEmotions[idx].position![0] !== pos.x) {
                            updatedEmotions[idx] = { ...updatedEmotions[idx], position: [pos.x, pos.y, pos.z] };
                            changed = true;
                        }
                    }
                } else {
                    const rnd = colorRng();
                    let c;
                    if (rnd > 0.7) c = new THREE.Color('#8b5e3c');
                    else if (rnd > 0.4) c = new THREE.Color('#87A986');
                    else c = new THREE.Color('#556b2f');

                    leafMeshRef.current!.setColorAt(i, c.convertSRGBToLinear());
                }
            });

            if (changed && onEmotionsUpdate) {
                onEmotionsUpdate(updatedEmotions);
            }
            if (leafMeshRef.current.instanceColor) leafMeshRef.current.instanceColor.needsUpdate = true;
        }
    }, [allTransforms, emotionIndices, emotions, onEmotionsUpdate, randomFor]);


    // --- FRAME LOOP ---
    const dummyRef = useRef(new THREE.Object3D());
    const dummy = dummyRef.current;

    useFrame((state, delta) => {
        if (!leafMeshRef.current || !scalesRef.current) return;
        if (isPaused) return;

        // Wind Config
        let windSpeed = 0.5;
        let windAmp = 0.005;
        if (windLevel === 'Off') { windSpeed = 0; windAmp = 0; }
        if (windLevel === 'Breezy') { windSpeed = 1.5; windAmp = 0.015; }
        if (reduceMotion) { windSpeed *= 0.1; windAmp *= 0.5; }

        if (leafMeshRef.current.userData.shader) {
            leafMeshRef.current.userData.shader.uniforms.uTime.value = state.clock.elapsedTime;
        }

        const elapsedTotal = state.clock.elapsedTime;
        const time = elapsedTotal * windSpeed;

        let needsUpdate = false;

        for (let i = 0; i < allTransforms.length; i++) {
            // Growth Animation
            if (elapsedTotal < delays[i]) continue;

            const target = targetScales[i];
            const current = scalesRef.current[i];

            let nextScale = current;
            if (current < target) {
                nextScale = Math.min(target, current + delta * 2.0); // Grow speed
                scalesRef.current[i] = nextScale;
                needsUpdate = true;
            }

            // Optimization: If grown and no wind, skip? 
            if (!needsUpdate && windLevel === 'Off') continue;

            // Physics Logic: Reconstruct from BASE (allTransforms[i])
            dummy.matrix.copy(allTransforms[i]);
            dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);

            // Apply scale
            dummy.scale.setScalar(nextScale);

            // Apply Wind (Deterministic Sway)
            // Phase based on position
            const phase = dummy.position.x * 0.5 + dummy.position.z * 0.3;
            // Noisy offset based on index
            const noise = (i % 20) * 0.1;

            const swayX = Math.sin(time + phase + noise) * windAmp;
            const swayZ = Math.cos(time * 0.8 + phase) * windAmp; // Different freq

            dummy.rotation.x += swayX;
            dummy.rotation.z += swayZ;

            dummy.updateMatrix();
            leafMeshRef.current.setMatrixAt(i, dummy.matrix);
            needsUpdate = true; // Always update if wind is on
        }

        if (needsUpdate) leafMeshRef.current.instanceMatrix.needsUpdate = true;

        // Halo Logic
        if (haloRef.current && (hoveredIndex !== null || focusedIndex !== null)) {
            const activeIdx = hoveredIndex !== null ? hoveredIndex : (allTransforms.length - emotions.length + focusedIndex);
            // Ensure we get the latest animated state
            leafMeshRef.current.getMatrixAt(activeIdx, dummy.matrix);
            dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);

            haloRef.current.position.copy(dummy.position);
            haloRef.current.quaternion.copy(dummy.quaternion);
            // Pulsing scale for halo?
            const pulse = 1.2 + Math.sin(state.clock.elapsedTime * 4) * 0.05;
            haloRef.current.scale.copy(dummy.scale).multiplyScalar(pulse);
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

    const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
        if (isCinematic) return;
        e.stopPropagation();
        const id = e.instanceId!;
        if (emotionIndices.has(id)) {
            setCursorPointer(true);
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
        setCursorPointer(false);
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
                    if (isCinematic) return;
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
