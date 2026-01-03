import React, { useMemo, useRef, useLayoutEffect, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useLoader, type ThreeEvent } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
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

// Ellipsoid Distribution (Canopy) - Deterministic RNG Version
const getCanopyPoints = (count: number, radiusX: number, radiusY: number, yOffset: number, rng: () => number) => {
    const points: THREE.Vector3[] = [];
    const minRadiusSq = 0.3 * 0.3; // Hollow center percentage squared

    let attempts = 0;
    while (points.length < count && attempts < count * 5) {
        attempts++;
        // Random point in unit sphere
        const u = rng();
        const v = rng();
        const theta = 2 * Math.PI * u;
        const phi = Math.acos(2 * v - 1);

        const r = Math.cbrt(rng()); // Cube root for uniform distribution

        // Convert to Cartesian
        const sinPhi = Math.sin(phi);
        const xNormalized = r * sinPhi * Math.cos(theta);
        const yNormalized = r * sinPhi * Math.sin(theta);
        const zNormalized = r * Math.cos(phi);

        // Check bounds (Hollow shell: 0.4 to 1.0)
        const distSq = xNormalized * xNormalized + yNormalized * yNormalized + zNormalized * zNormalized;

        if (distSq < minRadiusSq) continue;

        // Shape into ellipsoid
        const x = xNormalized * radiusX;
        const y = Math.abs(yNormalized) * radiusY + yOffset; // Abs(y) for upper dome, + offset
        const z = zNormalized * radiusX;

        points.push(new THREE.Vector3(x, y, z));
    }
    return points;
};

export const InstancedTree: React.FC<InstancedTreeProps> = ({ emotions, onLeafClick, onLeafHover, reduceMotion, seed, isCinematic, windLevel, isPaused }) => {
    // Refs
    const canopyMeshRef = useRef<THREE.InstancedMesh>(null);
    const emotionMeshRef = useRef<THREE.InstancedMesh>(null);
    const branchMeshRef = useRef<THREE.InstancedMesh>(null);
    const haloRef = useRef<THREE.Mesh>(null);

    // State
    const [hoveredEmotionIndex, setHoveredEmotionIndex] = useState<number | null>(null);
    const [focusedIndex] = useState<number>(0);
    const [cursorPointer, setCursorPointer] = useState(false);

    // Assets
    const [leafMap] = useLoader(THREE.TextureLoader, ['/folha.png']);
    const { scene: glbScene } = useGLTF("/folha.glb");

    // Extract geometry from GLB
    const glbGeometry = useMemo(() => {
        let geom: THREE.BufferGeometry | null = null;
        glbScene.traverse((obj) => {
            if ((obj as THREE.Mesh).isMesh && !geom) {
                geom = (obj as THREE.Mesh).geometry.clone();
                // Apply same centering logic as HeroLeaf if needed? 
                // HeroLeaf centers geometry. We should probably center it here too or pre-transform.
                // Let's simple center it.
                geom.center();
                // Scale it down? HeroLeaf scales it 2.0 / maxDim.
                // We'll apply scale in instance matrix.
            }
        });
        return geom || new THREE.PlaneGeometry(1, 1); // Fallback
    }, [glbScene]);

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

    // Fix Bug #1: Apply Branch Transforms
    useLayoutEffect(() => {
        if (branchMeshRef.current) {
            branchTransforms.forEach((mat, i) => {
                branchMeshRef.current!.setMatrixAt(i, mat);
            });
            branchMeshRef.current.instanceMatrix.needsUpdate = true;
        }
    }, [branchTransforms]);

    // --- LOD ARCHITECTURE: POINTS GENERATION ---
    const { canopyTransforms, emotionTransforms } = useMemo(() => {
        const NATIVE_COUNT = 1500;
        const RADIUS_X = 18;
        const RADIUS_Y = 14;
        const HEIGHT_OFFSET = 18;

        const distRng = randomFor(2);
        const jitterRng = randomFor(1);

        // 1. Generate ALL potential points (Base Canopy Cloud)
        // We generate enough points for Canopy + sufficient spacing for Emotions if we replaced them.
        // But the requirement is: "Emotion Leaves positions must be a SUBSET of canopyPoints".
        // So we generate NATIVE_COUNT points.
        const allPoints = getCanopyPoints(NATIVE_COUNT, RADIUS_X, RADIUS_Y, HEIGHT_OFFSET, distRng);

        // 2. Select Emotion Indices (Distribution logic)
        // We pick N indices to be emotions.
        const eTransforms: THREE.Matrix4[] = [];
        const cTransforms: THREE.Matrix4[] = [];

        // Distribute emotions
        // Distribute emotions
        // Shuffle available indices deterministically?
        // Or pick them by algorithm (distribution). User suggested: "N positions... Distribute by height/angle."
        // Let's walk through emotions and search for closest available canopy point matching a target region?
        // That's expensive. 
        // Simpler: Deterministic shuffle of available indices, pick top K? No, that's random distribution.
        // User wants "Balanced in the canopy".

        // Let's use the 'theta/phi' strategy from before to find IDEAL positions, 
        // then snap to nearest canopy point? Or just overwrite the canopy point?
        // "Position... Subset of canopyPoints".
        // Let's Snap to nearest.

        // A) Create map of points and usage
        const usedPointIndices = new Set<number>();

        emotions.forEach((emotion, i) => {
            // Ideal Params
            let heightBias = 0;
            if (emotion.category === 'alegria' || emotion.category === 'amor') heightBias = 6;
            if (emotion.category === 'medo' || emotion.category === 'tristeza') heightBias = -4;

            const theta = (i / emotions.length) * Math.PI * 2 * 3;
            const yNorm = (i / emotions.length) * 2 - 1;
            const phi = Math.acos(yNorm * 0.8);

            // Ideal Position
            const ix = Math.sin(phi) * Math.cos(theta) * (RADIUS_X + 2); // Slightly outer? No "floating ring". Match Canopy.
            // Let's match Canopy Radius precisely.
            const iy = Math.cos(phi) * RADIUS_Y + HEIGHT_OFFSET + heightBias;
            const iz = Math.sin(phi) * Math.sin(theta) * RADIUS_X;
            const idealPos = new THREE.Vector3(ix, iy, iz);

            // Find closest available canopy point
            let closestIdx = -1;
            let minDst = Infinity;

            // Optimization: Just check a random subset of 50 points to find a "good enough" one 
            // to avoid O(N*M) loop. Or just loop all if N=1500, M=100. 150,000 ops is fine.
            for (let j = 0; j < allPoints.length; j++) {
                if (usedPointIndices.has(j)) continue;
                // Simple distance check
                const d = allPoints[j].distanceToSquared(idealPos);
                if (d < minDst) {
                    minDst = d;
                    closestIdx = j;
                }
            }

            if (closestIdx !== -1) {
                usedPointIndices.add(closestIdx);
                const pos = allPoints[closestIdx];

                const dummy = new THREE.Object3D();
                dummy.position.copy(pos);
                dummy.lookAt(0, HEIGHT_OFFSET + 10, 0); // Emotions look at center-ish? Or Look Out?
                // Usually Look Out is better for leaves.
                dummy.lookAt(pos.x * 2, pos.y, pos.z * 2);

                // Scale Logic
                const intensity = emotion.intensity || 3;
                const s = 1.4 + (intensity / 5) * 0.4;
                // GLB might be huge or tiny, let's normalize scale. 
                // We'll assume scale '1' is roughly 1 unit sized leaf.
                // We put the target scale in the matrix.
                dummy.scale.set(s, s, s);
                dummy.updateMatrix();

                eTransforms.push(dummy.matrix);

                // Update the original emotion object with strict position for camera
                emotion.position = [pos.x, pos.y, pos.z];
            }
        });

        // 3. Build Canopy Transforms (The rest)
        allPoints.forEach((pos, idx) => {
            if (usedPointIndices.has(idx)) return;

            // Jitter
            pos.x += (jitterRng() - 0.5) * 2;
            pos.y += (jitterRng() - 0.5) * 2;
            pos.z += (jitterRng() - 0.5) * 2;

            const dummy = new THREE.Object3D();
            dummy.position.copy(pos);
            dummy.rotation.set(jitterRng() * Math.PI, jitterRng() * Math.PI, jitterRng() * Math.PI);

            const s = 0.6 + jitterRng() * 0.6;
            dummy.scale.set(s, s, s);
            dummy.updateMatrix();
            cTransforms.push(dummy.matrix);
        });

        return { canopyTransforms: cTransforms, emotionTransforms: eTransforms };
    }, [emotions, randomFor, glbGeometry]); // Re-run if geometry changes? No.


    // --- ANIMATION DELAYS & SCALES INIT ---
    // Combine for animation loop: [ ...canopy, ...emotions ]
    // We need to map back to refs properly.
    const combinedCount = canopyTransforms.length + emotionTransforms.length;

    const { delays, targetScales } = useMemo(() => {
        const delayRng = randomFor(3);
        const d = new Float32Array(combinedCount);
        const t = new Float32Array(combinedCount);
        const dummy = new THREE.Object3D();

        const process = (transforms: THREE.Matrix4[], offset: number) => {
            transforms.forEach((m, i) => {
                const idx = offset + i;
                d[idx] = delayRng() * 2.0;
                dummy.matrix.copy(m);
                dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
                t[idx] = dummy.scale.x;
            });
        };

        process(canopyTransforms, 0);
        process(emotionTransforms, canopyTransforms.length);

        return { delays: d, targetScales: t };
    }, [canopyTransforms, emotionTransforms, combinedCount, randomFor]);

    // Initialize/Reset ScalesRef
    useEffect(() => {
        scalesRef.current = new Float32Array(combinedCount).fill(0);
    }, [combinedCount]);


    // --- INIT MATRICES (Fix Bug #2) & COLORS ---
    useLayoutEffect(() => {
        // Init Canopy
        if (canopyMeshRef.current) {
            const dummy = new THREE.Object3D();
            canopyTransforms.forEach((mat, i) => {
                dummy.matrix.copy(mat);
                dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
                dummy.scale.set(0, 0, 0);
                dummy.updateMatrix();
                canopyMeshRef.current!.setMatrixAt(i, dummy.matrix);
                // Tint for canopy?
                // Let's give slight variation
                // const c = new THREE.Color('#556b2f').lerp(new THREE.Color('#87A986'), Math.random());
                // canopyMeshRef.current!.setColorAt(i, c); 
                // InstancedMesh default color is white if not set. We can use tint in material or set colors.
            });
            canopyMeshRef.current.instanceMatrix.needsUpdate = true;
        }

        // Init Emotions
        if (emotionMeshRef.current) {
            const dummy = new THREE.Object3D();
            emotionTransforms.forEach((mat, i) => {
                dummy.matrix.copy(mat);
                dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
                dummy.scale.set(0, 0, 0);
                dummy.updateMatrix();
                emotionMeshRef.current!.setMatrixAt(i, dummy.matrix);

                // Set Color from Emotion Data
                const em = emotions[i]; // emotionTransforms aligned with emotions array order (mostly)? 
                // Wait. We pushed eTransforms in loop over `emotions`.
                // So index `i` in eTransforms corresponds to `emotions[i]` IF we didn't skip any.
                // We only skip if no point found? Unlikely for 1500 points.
                // We should be safe assuming 1:1 if we were careful.
                if (em) {
                    const c = new THREE.Color(em.color).convertSRGBToLinear();
                    emotionMeshRef.current!.setColorAt(i, c);
                }
            });
            emotionMeshRef.current.instanceMatrix.needsUpdate = true;
            if (emotionMeshRef.current.instanceColor) emotionMeshRef.current.instanceColor.needsUpdate = true;
        }

    }, [canopyTransforms, emotionTransforms, emotions]); // Dependencies


    // --- FRAME LOOP ---
    const dummyRef = useRef(new THREE.Object3D());
    const dummy = dummyRef.current;

    useFrame((state, delta) => {
        if (!scalesRef.current) return;
        if (isPaused) return;

        // Wind
        let windSpeed = 0.5;
        let windAmp = 0.005;
        if (windLevel === 'Off') { windSpeed = 0; windAmp = 0; }
        if (windLevel === 'Breezy') { windSpeed = 1.5; windAmp = 0.015; }
        if (reduceMotion) { windSpeed *= 0.1; windAmp *= 0.5; }

        if (canopyMeshRef.current?.userData.shader) canopyMeshRef.current.userData.shader.uniforms.uTime.value = state.clock.elapsedTime;
        // Emotion mesh material is Physical, standard shader uniforms might not apply unless we hook it. 
        // But we do vertex displacement manually below anyway.

        const elapsedTotal = state.clock.elapsedTime;
        const time = elapsedTotal * windSpeed;

        let needsUpdateCanopy = false;
        let needsUpdateEmotion = false;

        // Loop Canopy
        for (let i = 0; i < canopyTransforms.length; i++) {
            const idx = i; // Global index 0..N
            if (elapsedTotal < delays[idx]) continue;

            // Growth
            const target = targetScales[idx];
            const current = scalesRef.current[idx];
            let nextScale = current;
            if (current < target) {
                nextScale = Math.min(target, current + delta * 2.0);
                scalesRef.current[idx] = nextScale;
                needsUpdateCanopy = true;
            }

            if (!needsUpdateCanopy && windLevel === 'Off') continue;

            dummy.matrix.copy(canopyTransforms[i]);
            dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
            dummy.scale.setScalar(nextScale);

            // Sway
            const phase = dummy.position.x * 0.5 + dummy.position.z * 0.3;
            // Lower amplitude for canopy (Layer A)
            const swayX = Math.sin(time + phase + i * 0.1) * windAmp * 0.8;
            const swayZ = Math.cos(time * 0.8 + phase) * windAmp * 0.8;

            dummy.rotation.x += swayX;
            dummy.rotation.z += swayZ;
            dummy.updateMatrix();

            canopyMeshRef.current?.setMatrixAt(i, dummy.matrix);
            needsUpdateCanopy = true;
        }

        // Loop Emotions
        for (let i = 0; i < emotionTransforms.length; i++) {
            const idx = canopyTransforms.length + i; // Offset index
            if (elapsedTotal < delays[idx]) continue;

            // Growth
            const target = targetScales[idx];
            const current = scalesRef.current[idx];
            let nextScale = current;
            if (current < target) {
                nextScale = Math.min(target, current + delta * 2.0);
                scalesRef.current[idx] = nextScale;
                needsUpdateEmotion = true;
            }

            if (!needsUpdateEmotion && windLevel === 'Off') continue;

            dummy.matrix.copy(emotionTransforms[i]);
            dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
            dummy.scale.setScalar(nextScale);

            // Sway (Premium behavior? Maybe same for now)
            const phase = dummy.position.x * 0.5 + dummy.position.z * 0.3;
            const swayX = Math.sin(time + phase + i * 0.1) * windAmp;
            const swayZ = Math.cos(time * 0.8 + phase) * windAmp;

            dummy.rotation.x += swayX;
            dummy.rotation.z += swayZ;
            dummy.updateMatrix();

            emotionMeshRef.current?.setMatrixAt(i, dummy.matrix);
            needsUpdateEmotion = true;
        }

        if (needsUpdateCanopy && canopyMeshRef.current) canopyMeshRef.current.instanceMatrix.needsUpdate = true;
        if (needsUpdateEmotion && emotionMeshRef.current) emotionMeshRef.current.instanceMatrix.needsUpdate = true;

        // Halo Logic (Only for emotions?)
        if (haloRef.current && (hoveredEmotionIndex !== null || focusedIndex !== null)) {
            const activeLocalIdx = hoveredEmotionIndex !== null ? hoveredEmotionIndex : focusedIndex;
            // This index is LOCAL to emotionTransforms/emotions array

            if (emotionMeshRef.current && activeLocalIdx < emotionTransforms.length) {
                emotionMeshRef.current.getMatrixAt(activeLocalIdx, dummy.matrix);
                dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
                haloRef.current.position.copy(dummy.position);
                haloRef.current.quaternion.copy(dummy.quaternion);

                const pulse = 1.2 + Math.sin(state.clock.elapsedTime * 4) * 0.05;
                haloRef.current.scale.copy(dummy.scale).multiplyScalar(pulse);
                haloRef.current.updateMatrix();
            }
        }
    });

    // Interaction Handlers (Targeted at Emotions only for now?)
    const handlePointerMoveEmotions = (e: ThreeEvent<PointerEvent>) => {
        if (isCinematic) return;
        e.stopPropagation();
        const id = e.instanceId!;
        // 'id' is index in emotionMesh, which maps 1:1 to emotions array
        setCursorPointer(true);
        if (hoveredEmotionIndex !== id) {
            setHoveredEmotionIndex(id);
            soundManager.playHover();
            onLeafHover(emotions[id], e.clientX, e.clientY);
        }
    };

    const handlePointerOut = () => {
        setCursorPointer(false);
        setHoveredEmotionIndex(null);
        onLeafHover(null, 0, 0);
    };

    return (
        <group>
            {/* Branches */}
            <instancedMesh
                ref={branchMeshRef}
                args={[undefined, undefined, branchTransforms.length]}
                castShadow
                receiveShadow
            >
                <cylinderGeometry args={[0.3, 0.4, 1, 5]} />
                <meshStandardMaterial color="#3E3228" roughness={0.9} />
            </instancedMesh>

            {/* Layer A: Canopy (Sprites) - Cheap */}
            <instancedMesh
                ref={canopyMeshRef}
                args={[undefined, undefined, canopyTransforms.length]}
                castShadow
                receiveShadow
            >
                <planeGeometry args={[1, 1]} />
                <meshStandardMaterial
                    map={leafMap}
                    transparent
                    side={THREE.DoubleSide}
                    alphaTest={0.4} // Tuned
                    depthWrite={false} // Tuned
                    color="#556b2f" // Base color
                />
            </instancedMesh>

            {/* Layer B: Emotions (GLB) - Premium */}
            <instancedMesh
                ref={emotionMeshRef}
                args={[glbGeometry, undefined, emotionTransforms.length]}
                castShadow
                receiveShadow
                onPointerMove={handlePointerMoveEmotions}
                onPointerOut={handlePointerOut}
                onClick={(e) => {
                    if (isCinematic) return;
                    e.stopPropagation();
                    const id = e.instanceId!;
                    soundManager.playClick();
                    onLeafClick(emotions[id]);
                }}
            >
                {/* Physical Material for Premium feel */}
                <meshPhysicalMaterial
                    color="#ffffff" // Tinted via instanceColor
                    metalness={0.0}
                    roughness={0.45}
                    clearcoat={0.35}
                    clearcoatRoughness={0.25}
                    transmission={0.2} // Glassy
                    thickness={0.18}
                    ior={1.35}
                />
            </instancedMesh>

            {/* Halo */}
            <mesh ref={haloRef} visible={hoveredEmotionIndex !== null}>
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
