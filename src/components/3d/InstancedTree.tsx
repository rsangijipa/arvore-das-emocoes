import React, { useMemo, useRef, useLayoutEffect, useEffect, useState } from 'react';
import * as THREE from 'three';
import { useFrame, useLoader, useThree, type ThreeEvent } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import { generateProceduralTree } from '../../utils/treeGenerator';
import { soundManager } from '../../utils/SoundManager';
import { useStore } from '../../store/useStore';
import { RAW_MESSAGES } from '../../data/messages';
import type { EmotionData } from '../../types';
import { createRng } from '../../utils/random';
// LOD utilities available but not actively used yet
// import { useLODConfig, getLODLevel, getLODSegments } from '../../utils/lod';
import { isWithinRenderDistance } from '../../utils/visibilityCulling';

// --- SHADER HELPERS REMOVED FOR STABILITY ---

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

export const InstancedTree: React.FC<InstancedTreeProps> = React.memo(({ emotions, onLeafClick, onLeafHover, reduceMotion, seed, isCinematic, windLevel, isPaused }) => {
    // Refs
    const canopyMeshRef = useRef<THREE.InstancedMesh>(null);
    const branchMeshRef = useRef<THREE.InstancedMesh>(null);
    const emotionMeshRefs = useRef<(THREE.InstancedMesh | null)[]>([]);
    const haloRef = useRef<THREE.Mesh>(null);
    const frameSkipRef = useRef(0); // For throttling on mobile

    // Shader Uniform Refs REMOVED

    // Global State
    const quality = useStore(state => state.quality);
    const deviceInfo = useStore(state => state.deviceInfo);
    // const lodConfig = useLODConfig(); // Available for future LOD implementation
    const { camera } = useThree();
    // const setFocusedLeaf = useStore(state => state.setFocusedLeaf); // Destructured above
    // const focusedLeaf = useStore(state => state.focusedLeaf); // Destructured above

    // State
    const [hoveredEmotionIndex, setHoveredEmotionIndex] = useState<number | null>(null);
    const [cursorPointer, setCursorPointer] = useState(false);
    const [stage, setStage] = useState(0);
    const frustumRef = useRef(new THREE.Frustum());

    // Sequence
    useEffect(() => {
        const t1 = setTimeout(() => setStage(1), 100);
        const t2 = setTimeout(() => setStage(2), 600);
        const t3 = setTimeout(() => setStage(3), 1600);
        return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
    }, []);

    // Assets
    // Preload textures for interactive leaves
    const textureUrls = useMemo(() => {
        if (quality === 'Low') {
            // Memory Optimization: Load only 1 texture for all leaves on Low quality
            return ['/textures/leaves/leaf_tex_01.png'];
        }
        return [
            '/textures/leaves/leaf_tex_01.png',
            '/textures/leaves/leaf_tex_02.png',
            '/textures/leaves/leaf_tex_03.png',
            '/textures/leaves/leaf_tex_04.png',
            '/textures/leaves/leaf_tex_05.png'
        ];
    }, [quality]);

    const leafMaps = useLoader(THREE.TextureLoader, textureUrls);

    // Store Actions
    const {
        focusedLeaf,
        setFocusedLeaf,
        interactionLock,
        setInteractionLock,
        setSelectedMessage
    } = useStore();

    useLayoutEffect(() => {
        leafMaps.forEach((tex) => {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.flipY = false;
            // Optimize textures for mobile
            if (deviceInfo.isMobile) {
                tex.minFilter = THREE.LinearFilter;
                tex.magFilter = THREE.LinearFilter;
                tex.generateMipmaps = false;
            }
        });
    }, [leafMaps, deviceInfo.isMobile]);

    // Simple Leaf Alpha Map (Procedural)
    const simpleLeafAlpha = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 512; // Higher res for better rounded edge
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, 512, 512);

            // Draw a nice leaf shape
            ctx.fillStyle = '#ffffff';
            ctx.translate(256, 256);
            ctx.beginPath();
            // Simple elliptical leaf with point
            ctx.moveTo(0, -240);
            ctx.bezierCurveTo(160, -120, 160, 120, 0, 240);
            ctx.bezierCurveTo(-160, 120, -160, -120, 0, -240);
            ctx.fill();
        }
        const tex = new THREE.CanvasTexture(canvas);
        // tex.minFilter = THREE.LinearFilter; // Default is LinearMipmapLinear which fails for non-POT if webgl1? 128 is POT.
        return tex;
    }, []);

    // Preload emotion textures (PNG)
    useTexture.preload([
        '/textures/leaves/leaf_tex_01.png',
        '/textures/leaves/leaf_tex_02.png',
        '/textures/leaves/leaf_tex_03.png',
        '/textures/leaves/leaf_tex_04.png',
        '/textures/leaves/leaf_tex_05.png',
    ]);

    // const canopyMap = leafMaps[0];

    // Fallback for logic below if we only have 1 texture (treat as if we have 5 slots pointing to same or handle index)
    // The grouping logic relies on texture URL matching or index.
    // We need to ensure logic downstream handles the single texture case.

    // const { scene: glbScene } = useGLTF("/folha.glb"); // REMOVED

    // 1. Heavy Geometry (Emotions) -> NOW LIGHTWEIGHT PLANE
    const glbGeometry = useMemo(() => {
        return new THREE.PlaneGeometry(1, 1);
    }, []);

    // 2. Light Geometry (Canopy)
    const canopyGeometry = useMemo(() => {
        return new THREE.PlaneGeometry(1, 1);
    }, []);

    // 3. Branches (Tapered Cylinder)
    // Super Prompt: "Afinamento dos Galhos (Tapering)"
    const branchGeometry = useMemo(() => {
        // RadiusTop: 0.04 (Delicate Tip), RadiusBottom: 0.6 (Strong Base), Height: 1
        const geo = new THREE.CylinderGeometry(0.04, 0.6, 1, 6);
        geo.translate(0, 0.5, 0);
        return geo;
    }, []);

    // 3. Materials
    const canopyMaterial = useMemo(() => (
        <meshStandardMaterial
            color="#90ee90" // Light green
            alphaMap={simpleLeafAlpha}
            transparent
            alphaTest={0.5}
            depthWrite={false}
            side={THREE.DoubleSide}
        // onBeforeCompile={(shader) => {
        //     patchWindShader(shader);
        //     canopyShaderRef.current = shader;
        // }}
        />
    ), [simpleLeafAlpha]);

    // 5. Material Pool for Interactive Leaves
    // Super Prompt: "Crie 5 materiais PBR distintos"
    const emotionMaterials = useMemo(() => {
        return leafMaps.map(tex => new THREE.MeshStandardMaterial({
            map: tex,
            transparent: true,
            alphaTest: 0.5, // Re-enabled as we now have transparency in PNGs
            side: THREE.DoubleSide,
            roughness: 0.7,
            metalness: 0.1,
            color: '#ffffff' // Ensure texture color is preserved
        }));
    }, [leafMaps]);

    const scalesRef = useRef<Float32Array | null>(null);
    const branchScalesRef = useRef<Float32Array | null>(null);

    useEffect(() => {
        document.body.style.cursor = cursorPointer ? 'pointer' : 'auto';
        return () => { document.body.style.cursor = 'auto'; };
    }, [cursorPointer]);

    // --- GEOMETRY GENERATION ---
    const { branches, leafAnchors, treeBounds } = useMemo(() => {
        // Map Quality to Complexity (Depth)
        // Low = 4 (Safe for mobile/webgl1), High = 5 (Standard), Ultra = 6
        let complexity = 5;
        if (quality === 'Low') complexity = 4;
        if (quality === 'Ultra') complexity = 6;
        if (deviceInfo.isMobile) complexity = Math.min(complexity, 4); // Force Low on mobile

        const { branches, leafAnchors } = generateProceduralTree(seed, complexity);

        // Compute Bounds
        const min = new THREE.Vector3(Infinity, Infinity, Infinity);
        const max = new THREE.Vector3(-Infinity, -Infinity, -Infinity);

        const updateBounds = (v: THREE.Vector3) => {
            min.min(v);
            max.max(v);
        };

        branches.forEach(b => {
            updateBounds(b.start);
            updateBounds(b.end);
        });

        const dummyPos = new THREE.Vector3();
        const dummyScale = new THREE.Vector3();
        const dummyQuat = new THREE.Quaternion();

        leafAnchors.forEach(mat => {
            mat.decompose(dummyPos, dummyQuat, dummyScale);
            updateBounds(dummyPos);
        });

        const size = new THREE.Vector3().subVectors(max, min);
        const center = new THREE.Vector3().addVectors(min, max).multiplyScalar(0.5);

        // Grounding Offset: Move minY to 0
        const offsetY = -min.y;

        return { branches, leafAnchors, treeBounds: { min, max, size, center, offsetY } };
    }, [seed, quality, deviceInfo.isMobile]);

    const totalAnchors = leafAnchors.length;

    // Camera Framing & Grounding
    const groupRef = useRef<THREE.Group>(null);
    const { controls } = useThree();

    useLayoutEffect(() => {
        if (!groupRef.current || !camera) return;

        // --- Tree Positioning: 20% above base in brightest area of background ---
        // 1. Define Ground Plane (Y=0)
        const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

        // 2. Define Anchor Point in Normalized Device Coordinates (NDC)
        // Center-left area (brightest area typically in center of 360 image)
        // x: slightly left of center, y: 20% above bottom (0.2 from bottom = -0.6 in NDC)
        const anchorNDC = new THREE.Vector2(-0.15, -0.6);

        // 3. Raycast from Camera to Ground
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(anchorNDC, camera);

        const targetPoint = new THREE.Vector3();
        const hit = raycaster.ray.intersectPlane(groundPlane, targetPoint);

        if (hit) {
            // 4. Calculate Vertical Offset
            // treeBounds.offsetY brings min.y to 0
            // Add 20% of tree height above base
            const treeHeight = treeBounds.size.y;
            const heightOffset = treeHeight * 0.2; // 20% above base
            const newY = treeBounds.offsetY + heightOffset;

            // 5. Apply Position
            groupRef.current.position.set(targetPoint.x, newY, targetPoint.z);
            groupRef.current.updateMatrixWorld();

            // Tree anchored at 20% above base in brightest area
            if (import.meta.env.DEV) {
                console.log(` Tree Anchored: World[${targetPoint.x.toFixed(2)}, ${newY.toFixed(2)}, ${targetPoint.z.toFixed(2)}] (20% above base)`);
            }

            // 6. Focus controls on the tree center
            if (controls) {
                // @ts-expect-error - OrbitControls has target property but not in types
                const orb = controls as { target: THREE.Vector3; update: () => void };
                // Calculate world center of the tree
                const worldCenter = treeBounds.center.clone().add(groupRef.current.position);
                // Adjust target so rotation pivots around the tree
                orb.target.copy(worldCenter);
                orb.update();
            }
        } else {
            // Fallback if ray misses ground
            const treeHeight = treeBounds.size.y;
            const heightOffset = treeHeight * 0.2;
            groupRef.current.position.set(0, treeBounds.offsetY + heightOffset, 0);
        }

    }, [treeBounds, camera, controls]);

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

    // Apply Branches
    useLayoutEffect(() => {
        const dummy = new THREE.Object3D();
        if (branchMeshRef.current) {
            branchScalesRef.current = new Float32Array(branches.length).fill(0);
            branches.forEach((_, i) => {
                branchMeshRef.current!.getMatrixAt(i, dummy.matrix);
                dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
                dummy.scale.set(0.0001, 0.0001, 0.0001);
                dummy.updateMatrix();
                branchMeshRef.current!.setMatrixAt(i, dummy.matrix);
            });
            branchMeshRef.current.instanceMatrix.needsUpdate = true;
        }
    }, [branches, branchTransforms]);

    // --- LEAF DISTRIBUTION & TEXTURE GROUPING ---
    const { canopyTransforms, emotionGroups, instanceLookup } = useMemo(() => {
        const rng = createRng(seed);

        // Shuffle anchor indices
        const indices = Array.from({ length: totalAnchors }, (_, i) => i);
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }

        const emotionCount = Math.min(emotions.length, totalAnchors);
        const cTransforms: THREE.Matrix4[] = [];
        const eGroups: { transforms: THREE.Matrix4[], originalIndices: number[] }[] = Array.from({ length: 5 }, () => ({ transforms: [], originalIndices: [] }));

        // Helper to extract index from "/leaf_texture_N.png"
        const getTexIdx = (url?: string) => {
            if (!url) return 0;
            // Matches "leaf_tex_01.jpg" -> "01" -> 1. Handles optional leading zero.
            const match = url.match(/leaf_tex_0?(\d+)\.jpg/);
            return match ? (parseInt(match[1]) - 1) : 0;
        };

        const dummy = new THREE.Object3D();
        const jitterRng = createRng(seed * 2);

        // Process all anchors
        for (let i = 0; i < totalAnchors; i++) {
            const anchorIdx = indices[i];
            const anchorMat = leafAnchors[anchorIdx];

            dummy.matrix.copy(anchorMat);
            dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);

            // Jitter
            dummy.position.x += (jitterRng() - 0.5) * 1.5;
            dummy.position.y += (jitterRng() - 0.5) * 1.5;
            dummy.position.z += (jitterRng() - 0.5) * 1.5;

            const rotJitter = new THREE.Euler(
                jitterRng() * Math.PI,
                jitterRng() * Math.PI,
                jitterRng() * Math.PI
            );
            dummy.quaternion.multiply(new THREE.Quaternion().setFromEuler(rotJitter));
            dummy.updateMatrix();

            if (i < emotionCount) {
                // It's an Emotion
                // Assign ordered emotions to random anchors
                const emotionIdx = i;
                const texGroupIdx = getTexIdx(emotions[emotionIdx]?.textureUrl);

                // Add to specific texture group
                if (eGroups[texGroupIdx]) {
                    eGroups[texGroupIdx].transforms.push(dummy.matrix.clone());
                    eGroups[texGroupIdx].originalIndices.push(emotionIdx);
                }
            } else {
                // It's Canopy
                cTransforms.push(dummy.matrix.clone());
            }
        }

        // Build flat map for lookup: [texGroupIdx][instanceId] -> originalEmotionIndex
        const lookup = eGroups.map(g => g.originalIndices);

        return { canopyTransforms: cTransforms, emotionGroups: eGroups, instanceLookup: lookup };
    }, [leafAnchors, seed, emotions, totalAnchors]);

    const activeEmotionCount = Math.min(emotions.length, totalAnchors);
    const combinedCount = canopyTransforms.length + activeEmotionCount;

    const { delays, targetScales } = useMemo(() => {
        const dRng = createRng(seed + 100);
        const sRng = createRng(seed + 200);
        const d = new Float32Array(combinedCount);
        const t = new Float32Array(combinedCount);

        // Canopy
        for (let i = 0; i < canopyTransforms.length; i++) {
            d[i] = dRng() * 2.0;
            t[i] = 0.7 + sRng() * 0.5;
        }

        // Emotions (Order matches 'emotions' array logic: Indices = offset + emotionIdx)
        const offset = canopyTransforms.length;
        for (let i = 0; i < activeEmotionCount; i++) {
            const idx = offset + i;
            d[idx] = dRng() * 2.0;
            const em = emotions[i];
            const intensity = em?.intensity || 3;
            t[idx] = 1.3 + (intensity / 5) * 0.5;
        }
        return { delays: d, targetScales: t };
    }, [canopyTransforms.length, activeEmotionCount, combinedCount, seed, emotions]);

    useLayoutEffect(() => {
        scalesRef.current = new Float32Array(combinedCount).fill(1.0);
    }, [combinedCount]);

    // Initial Layout - Set Colors/Matrices
    useLayoutEffect(() => {
        const dummy = new THREE.Object3D();

        // Canopy
        if (canopyMeshRef.current) {
            canopyTransforms.forEach((mat, i) => {
                dummy.matrix.copy(mat);
                dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
                dummy.scale.setScalar(1.0); // Start Full Size
                scalesRef.current![i] = 1.0;
                dummy.updateMatrix();
                canopyMeshRef.current!.setMatrixAt(i, dummy.matrix);

                const cRng = createRng(seed * 7 + i);
                const color = new THREE.Color('#90ee90'); // Base light green

                // 50% green variation for Common Leaves
                const hVar = (cRng() - 0.5) * 0.08; // Subtle Hue variation
                const sVar = (cRng() - 0.5) * 0.20; // Saturation
                const lVar = (cRng() - 0.5) * 0.50; // 50% Lightness variation as requested

                color.offsetHSL(hVar, sVar, lVar);
                canopyMeshRef.current!.setColorAt(i, color.convertSRGBToLinear());
            });
            canopyMeshRef.current.instanceMatrix.needsUpdate = true;
            if (canopyMeshRef.current.instanceColor) canopyMeshRef.current.instanceColor.needsUpdate = true;
        }

        // Emotions (Groups)
        emotionGroups.forEach((group, gIdx) => {
            const mesh = emotionMeshRefs.current[gIdx];
            if (mesh) {
                group.transforms.forEach((mat, i) => {
                    dummy.matrix.copy(mat);
                    dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
                    dummy.scale.setScalar(1.0); // Start Full Size
                    // scalesRef.current![scaleIdx] = 1.0; 
                    dummy.updateMatrix();
                    mesh.setMatrixAt(i, dummy.matrix);

                    const originalIdx = instanceLookup[gIdx][i];
                    const em = emotions[originalIdx];
                    if (em) {
                        // Ensure textures react to light (PBR) but keep legibility
                        // White color multiplied by light = standard PBR behavior
                        // We tint slightly based on the texture index if needed, but the texture has color.
                        // For now, keep it white to show the texture's true color.
                        const c = new THREE.Color('#ffffff').convertSRGBToLinear();
                        mesh.setColorAt(i, c);
                    }
                });
                mesh.instanceMatrix.needsUpdate = true;
                if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
            }
        });

    }, [canopyTransforms, emotionGroups, emotions, seed, instanceLookup]);

    useFrame((state, delta) => {
        if (!scalesRef.current || isPaused) return;



        // Throttle updates on mobile/low-end devices (update every 2-3 frames)
        if (deviceInfo.isMobile || deviceInfo.isLowEnd) {
            frameSkipRef.current++;
            const skipFrames = deviceInfo.isLowEnd ? 3 : 2;
            if (frameSkipRef.current % skipFrames !== 0) {
                return; // Skip this frame
            }
        }

        const time = state.clock.elapsedTime;
        const dummy = new THREE.Object3D();

        let needsUpdateBranch = false;
        let needsUpdateCanopy = false;
        const needsUpdateGroups = [false, false, false, false, false];

        // Update frustum for culling
        frustumRef.current.setFromProjectionMatrix(
            new THREE.Matrix4().multiplyMatrices(
                camera.projectionMatrix,
                camera.matrixWorldInverse
            )
        );

        // 1. Grow Branches (Slower)
        if (stage >= 1 && branchMeshRef.current && branchScalesRef.current) {
            const startDelay = 0.5;

            for (let i = 0; i < branches.length; i++) {
                const b = branches[i];
                const activationTime = startDelay + (b.order * 0.35);

                if (time < activationTime) continue;

                const currentScaleY = branchScalesRef.current[i];
                if (currentScaleY < 1.0) {
                    // Slower growth speed
                    const newScale = Math.min(1.0, currentScaleY + delta * 1.5);
                    branchScalesRef.current[i] = newScale;
                    needsUpdateBranch = true;

                    const targetMat = branchTransforms[i];
                    dummy.matrix.copy(targetMat);
                    dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);

                    const easout = 1 - Math.pow(1 - newScale, 3);
                    dummy.scale.multiplyScalar(easout);

                    dummy.updateMatrix();
                    branchMeshRef.current.setMatrixAt(i, dummy.matrix);
                }
            }
        }

        // Wind
        let windSpeed = 0.6;
        let windAmp = 0.008;
        if (windLevel === 'Off') { windSpeed = 0; windAmp = 0; }
        if (windLevel === 'Breezy') { windSpeed = 1.4; windAmp = 0.015; }
        if (reduceMotion) { windSpeed *= 0.1; windAmp *= 0.4; }

        // Update Shader Uniforms - DISABLED
        /* 
        // Refs are removed, so this code is dead
        if (canopyShaderRef.current) {
            canopyShaderRef.current.uniforms.uTime.value = time;
            canopyShaderRef.current.uniforms.uWindParams.value.set(windSpeed, windAmp);
        }
        emotionShaderRefs.current.forEach(shader => {
            if (shader) {
                shader.uniforms.uTime.value = time;
                shader.uniforms.uWindParams.value.set(windSpeed, windAmp);
            }
        });
        */

        // 2. Canopy
        if (stage >= 2) {
            for (let i = 0; i < canopyTransforms.length; i++) {
                // Optimization: If growth full, skip updating matrix (Wind is on GPU now)
                const current = scalesRef.current[i];
                const target = targetScales[i];

                // Only update if not fully grown OR if we need to check visibility (though culling should ideally be separate)
                // For simplicity and perf: Only update during growth
                if (current >= target) continue;

                if (time < delays[i] + 4.0) continue;

                dummy.matrix.copy(canopyTransforms[i]);
                dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);

                // Visibility culling: skip if too far or outside frustum
                // Note: We only cull updates here. If it's static, it renders.
                // GPU Frustum culling handles rendering.
                if (deviceInfo.isMobile && !isWithinRenderDistance(dummy.position, camera, 100)) {
                    continue;
                }

                let scale = current;
                // Growth Logic
                scale = Math.min(target, current + delta * 1.5);
                scalesRef.current[i] = scale;
                needsUpdateCanopy = true;

                dummy.scale.setScalar(scale);

                // Wind Rotation
                const phase = dummy.position.x * 0.4 + dummy.position.z * 0.2 + i * 0.1;
                dummy.rotation.x += Math.sin(time * windSpeed + phase) * windAmp;
                dummy.rotation.z += Math.cos(time * windSpeed * 0.8 + phase) * windAmp;

                dummy.updateMatrix();
                canopyMeshRef.current?.setMatrixAt(i, dummy.matrix);
            }
        }

        // 3. Emotions (Groups)
        if (stage >= 3) {
            const offset = canopyTransforms.length;
            emotionGroups.forEach((group, gIdx) => {
                const mesh = emotionMeshRefs.current[gIdx];
                if (!mesh) return;

                group.transforms.forEach((mat, i) => {
                    const originalIdx = instanceLookup[gIdx][i];
                    const scaleIdx = offset + originalIdx;

                    // IF THIS IS THE FOCUSED LEAF, FORCE SCALE 0 (Hide it, HeroLeaf takes over)
                    const isFocused = focusedLeaf && focusedLeaf.textureIndex === gIdx && focusedLeaf.instanceId === i;

                    if (isFocused) {
                        dummy.matrix.copy(mat);
                        dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);

                        // Only update if not already 0
                        // Since we can't easily check current matrix scale without getMatrixAt, we just force update if focused
                        // Optimized: check a flag or just do it. Doing it for 1 leaf is fine.
                        dummy.scale.set(0, 0, 0);
                        dummy.updateMatrix();
                        mesh.setMatrixAt(i, dummy.matrix);
                        needsUpdateGroups[gIdx] = true;
                        return;
                    }

                    // IF we just unfocused, we need to restore it. 
                    // This creates a need to track state. For now, the loop below restores it if scale < target.
                    // But if scale == target, we don't enter the loop.
                    // The 'scalesRef' holds the target visual scale (growth).

                    // Optimization: Check growth
                    const current = scalesRef.current![scaleIdx];
                    const target = targetScales[scaleIdx];

                    // If grown and not focused, still update for wind
                    // if (current >= target) return;

                    if (time < delays[scaleIdx] + 4.5) return;

                    dummy.matrix.copy(mat);
                    dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);

                    if (deviceInfo.isMobile && !isWithinRenderDistance(dummy.position, camera, 100)) {
                        return;
                    }

                    let scale = current;

                    if (current < target) {
                        scale = Math.min(target, current + delta * 1.5);
                        scalesRef.current![scaleIdx] = scale;
                        needsUpdateGroups[gIdx] = true;
                    }

                    dummy.scale.setScalar(scale);

                    // Wind Rotation
                    const phase = dummy.position.x * 0.4 + dummy.position.z * 0.2 + originalIdx * 0.1;
                    dummy.rotation.x += Math.sin(time * windSpeed + phase) * windAmp * 1.2;
                    dummy.rotation.z += Math.cos(time * windSpeed * 0.8 + phase) * windAmp * 1.2;

                    dummy.updateMatrix();
                    mesh.setMatrixAt(i, dummy.matrix);
                });
            });
        }

        if (needsUpdateBranch && branchMeshRef.current) branchMeshRef.current.instanceMatrix.needsUpdate = true;
        if (needsUpdateCanopy && canopyMeshRef.current) {
            // DEBUG: Check first instance matrix
            const testMat = new THREE.Matrix4();
            canopyMeshRef.current.getMatrixAt(0, testMat);
            if (import.meta.env.DEV && testMat.elements.some(e => isNaN(e))) {
                console.error('DEBUG: NaN detected in canopy instance 0');
            }
            canopyMeshRef.current.instanceMatrix.needsUpdate = true;
        }

        needsUpdateGroups.forEach((needsUpdate, gIdx) => {
            if (needsUpdate && emotionMeshRefs.current[gIdx]) {
                emotionMeshRefs.current[gIdx]!.instanceMatrix.needsUpdate = true;
            }
        });

        // Halo
        if (haloRef.current && hoveredEmotionIndex !== null) {
            const em = emotions[hoveredEmotionIndex];
            if (em) {
                // Determine group from texture - Safely
                let gIdx = 0;
                if (em.textureUrl) {
                    const match = em.textureUrl.match(/leaf_tex_0?(\d+)\.jpg/);
                    if (match && match[1]) {
                        gIdx = parseInt(match[1]) - 1;
                    }
                }

                const group = emotionGroups[gIdx];
                if (group) {
                    const instanceId = instanceLookup[gIdx].indexOf(hoveredEmotionIndex);

                    if (instanceId !== -1 && emotionMeshRefs.current[gIdx]) {
                        emotionMeshRefs.current[gIdx]!.getMatrixAt(instanceId, dummy.matrix);
                        dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
                        haloRef.current.position.copy(dummy.position);
                        haloRef.current.quaternion.copy(dummy.quaternion);
                        haloRef.current.scale.copy(dummy.scale).multiplyScalar(1.2 + Math.sin(time * 3) * 0.05);
                        haloRef.current.updateMatrix();
                    }
                }
            }
        }
    });

    const handlePointerAction = (e: ThreeEvent<PointerEvent | MouseEvent>, type: 'hover' | 'click') => {
        if (isCinematic) return;
        e.stopPropagation();

        const gIdx = emotionMeshRefs.current.findIndex(ref => ref === e.object);
        if (gIdx === -1) return;

        // Safety check for instanceId
        if (typeof e.instanceId !== 'number') return;

        const instanceId = e.instanceId;
        const lookupGroup = instanceLookup[gIdx];

        // Safety check for lookup bounds
        if (!lookupGroup || instanceId < 0 || instanceId >= lookupGroup.length) return;

        const originalIdx = lookupGroup[instanceId];

        if (originalIdx !== undefined && originalIdx >= 0 && originalIdx < emotions.length) {
            const emotion = emotions[originalIdx];
            if (!emotion) return;

            if (type === 'hover') {
                if (interactionLock) return; // Ignore hover if locked
                setCursorPointer(true);
                if (hoveredEmotionIndex !== originalIdx) {
                    setHoveredEmotionIndex(originalIdx);
                    soundManager.playHover();
                    onLeafHover(emotion, e.clientX, e.clientY);
                }
            } else {
                // CLICK HANDLER - Smooth physics-based interaction
                if (interactionLock) return;

                // 1. Lock Interaction
                setInteractionLock(true);
                setTimeout(() => setInteractionLock(false), 800); // Longer debounce for smooth animation

                // 2. Select Message (Random for variety)
                const msgIdx = Math.floor(Math.random() * RAW_MESSAGES.length);
                const selectedMsg = RAW_MESSAGES[msgIdx];

                // 3. Capture World Matrix with smooth transition
                if (emotionMeshRefs.current[gIdx]) {
                    const dummy = new THREE.Object3D();
                    emotionMeshRefs.current[gIdx]!.getMatrixAt(instanceId, dummy.matrix);

                    // Pre-multiply with group world matrix
                    const worldMatrix = dummy.matrix.clone();
                    if (groupRef.current) {
                        worldMatrix.premultiply(groupRef.current.matrixWorld);
                    }

                    // 4. Set Focused Leaf first (triggers HeroLeaf animation)
                    setFocusedLeaf({
                        id: emotion.id,
                        textureIndex: gIdx,
                        instanceId: instanceId,
                        matrix: worldMatrix
                    });

                    // 5. Delay message card appearance for smooth transition
                    // Wait for leaf animation to start (200ms)
                    setTimeout(() => {
                        setSelectedMessage(selectedMsg);
                    }, 200);

                    // 6. Notify Parent
                    onLeafClick(emotion);
                }

                soundManager.playClick();
            }
        }
    };



    return (
        <group ref={groupRef}>
            {/* Branches */}
            <instancedMesh
                ref={branchMeshRef}
                args={[branchGeometry, undefined, branchTransforms.length]}
                castShadow={!deviceInfo.isMobile}
                receiveShadow={!deviceInfo.isMobile}
                frustumCulled={true}
            >
                <meshStandardMaterial color="#3E3228" roughness={0.9} />
            </instancedMesh>

            {/* Canopy (Light Leaf) */}
            <instancedMesh
                ref={canopyMeshRef}
                args={[canopyGeometry, undefined, canopyTransforms.length]}
                castShadow={!deviceInfo.isMobile}
                receiveShadow={!deviceInfo.isMobile}
                visible={true}
                frustumCulled={true}
            >
                {canopyMaterial}
            </instancedMesh>

            {/* Emotions - 5 Groups */}
            {emotionGroups.map((group, i) => (
                <instancedMesh
                    key={`em-group-${i}`}
                    ref={el => emotionMeshRefs.current[i] = el}
                    args={[glbGeometry, emotionMaterials[i] || emotionMaterials[0], group.transforms.length]}
                    castShadow={!deviceInfo.isMobile}
                    receiveShadow={!deviceInfo.isMobile}
                    visible={true}
                    frustumCulled={true}
                    onPointerMove={(e) => handlePointerAction(e, 'hover')}
                    onPointerOut={() => { setCursorPointer(false); setHoveredEmotionIndex(null); onLeafHover(null, 0, 0); }}
                    onClick={(e) => handlePointerAction(e, 'click')}
                />
            ))}

            <mesh ref={haloRef} visible={hoveredEmotionIndex !== null}>
                <planeGeometry args={[1.2, 1.2]} />
                <meshStandardMaterial color="white" emissive="white" emissiveIntensity={1.5} transparent opacity={0.3} depthTest={false} side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
});

InstancedTree.displayName = 'InstancedTree';
