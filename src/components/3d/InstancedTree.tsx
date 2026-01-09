import React, { useMemo, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useOptimizedTextureLoader } from '../../hooks/useOptimizedTextureLoader';
import { generateProceduralTree } from '../../utils/treeGenerator';
import { soundManager } from '../../utils/SoundManager';
import { useStore } from '../../store/useStore';
import { RAW_MESSAGES } from '../../data/messages';
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

// -----------------------------------------------------------------------------
// GPU WIND SHADER
// -----------------------------------------------------------------------------
const windShaderPatch = (shader: any) => {
    shader.uniforms.uTime = { value: 0 };
    shader.uniforms.uWindParams = { value: new THREE.Vector2(1.0, 0.1) }; // speed, strength

    shader.vertexShader = `
        uniform float uTime;
        uniform vec2 uWindParams;
        ${shader.vertexShader}
    `;

    shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        vec3 transformed = vec3( position );
        
        // --- WIND LOGIC (GPU) ---
        float windSpeed = uWindParams.x;
        float windStrength = uWindParams.y;
        
        if (windStrength > 0.001) {
             // Use world position (via instanceMatrix) to create varied phase
             // We can approximate world position using instanceMatrix * 0,0,0
             vec4 instancePos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
             
             // Phase based on X/Z position
             float phase = instancePos.x * 0.5 + instancePos.z * 0.3;
             
             // Two layers of noise
             // 1. Flutter (Fast, small)
             float flutter = sin(uTime * 3.0 + phase * 2.0) * 0.05 * windStrength;
             
             // 2. Sway (Slow, large)
             // Using simple sin wave for stability/performance over Perlin noise
             float sway = sin(uTime * 0.5 * windSpeed + phase) * 0.2 * windStrength;
             
             // Height influence: Grow stronger near top? 
             // Assuming local vertex.y is reasonable or using instancePos.y
             float heightFactor = smoothstep(0.0, 10.0, instancePos.y); 
             
             // Apply deformations
             transformed.x += sway * heightFactor + flutter;
             transformed.y += flutter * 0.5; // slight bobbing
             transformed.z += flutter;
             
             // Simple rotation approximation around anchor
             float angle = sway * 0.2 * heightFactor;
             float c = cos(angle);
             float s = sin(angle);
             
             // Rotate X/Z around Y slightly
             float tx = transformed.x * c - transformed.z * s;
             float tz = transformed.x * s + transformed.z * c; // Typo fix: z*c
             transformed.x = tx;
             // transformed.z = tz; // Skip full rotation to save cycles, just X sway is mostly effective
        }
        // ------------------------
        `
    );
};

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------
export const InstancedTree: React.FC<InstancedTreeProps> = React.memo(({
    emotions,
    onLeafClick,
    onLeafHover,
    reduceMotion,
    seed,
    isCinematic,
    windLevel,
    isPaused
}) => {
    // Refs
    // 0 = Canopy, 1..5 = Emotion Textures
    const meshRefs = useRef<(THREE.InstancedMesh | null)[]>([]);
    const materialShaderRefs = useRef<any[]>([]);
    const groupRef = useRef<THREE.Group>(null);

    // Store Actions
    const { setFocusedLeaf, interactionLock, setInteractionLock, setSelectedMessage } = useStore();

    // Textures with correct base path
    const textureUrls = useMemo(() => {
        const base = import.meta.env.BASE_URL || '/';
        const cleanBase = base.endsWith('/') ? base : `${base}/`;
        return [
            `${cleanBase}textures/leaves/leaf_tex_01.png`,
            `${cleanBase}textures/leaves/leaf_tex_02.png`,
            `${cleanBase}textures/leaves/leaf_tex_03.png`,
            `${cleanBase}textures/leaves/leaf_tex_04.png`,
            `${cleanBase}textures/leaves/leaf_tex_05.png`
        ];
    }, []);

    // Use our robust loader instead of standard useLoader
    const { deviceInfo } = useStore();
    const leafMaps = useOptimizedTextureLoader(textureUrls, deviceInfo.isMobile);

    useLayoutEffect(() => {
        leafMaps.forEach(tex => {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.flipY = false;
        });
    }, [leafMaps]);

    // Geometries (Memoized & shared)
    // Branch: Thicker base, thin tip: Cylinder(top, bottom, height, segs)
    // Protocol: CylinderGeometry(0.04, 0.6, 1, 6) -> 0.04 top radius?, 0.6 bottom? 
    // ThreeJS Cylinder: radiusTop, radiusBottom, height, radialSegments
    const branchGeometry = useMemo(() => {
        const g = new THREE.CylinderGeometry(0.04, 0.6, 1, 6);
        g.translate(0, 0.5, 0); // Pivot at base
        return g;
    }, []);

    const leafGeometry = useMemo(() => {
        // Protocol 2: 1.2, 1.6 (3:4 aspect)
        return new THREE.PlaneGeometry(1.2, 1.6);
        // Default center origin is usually fine for these billboard-ish leaves, 
        // but often we want pivot at stem (bottom).
        // Let's translate Y up by half height.
        // g.translate(0, 0.8, 0); 
        // Leaving centered allows easier rotation in cluster logic.
    }, []);

    // -------------------------------------------------------------------------
    // PROCEDURAL GENERATION (Memoized)
    // -------------------------------------------------------------------------
    const { branches, canopyTransforms, emotionGroups, instanceLookup } = useMemo(() => {
        // 1. Generate Skeleton
        const treeData = generateProceduralTree(seed);

        // 2. Generate Dense Cluster Leaves
        // For each anchor, generate 3 leaves with variations
        const rng = createRng(seed);
        const clusterAnchors: THREE.Matrix4[] = [];

        const dummy = new THREE.Object3D();
        const tempPos = new THREE.Vector3();
        const tempQuat = new THREE.Quaternion();
        const tempScale = new THREE.Vector3();

        treeData.leafAnchors.forEach((anchorMat) => {
            anchorMat.decompose(tempPos, tempQuat, tempScale);

            // Generate 3 leaves per anchor
            for (let k = 0; k < 3; k++) {
                dummy.position.copy(tempPos);
                dummy.quaternion.copy(tempQuat);
                dummy.scale.setScalar(1.0);

                // Varied Offsets
                const offsetX = (rng() - 0.5) * 0.5;
                const offsetY = (rng() - 0.5) * 0.5;
                const offsetZ = (rng() - 0.5) * 0.5;
                dummy.position.add(new THREE.Vector3(offsetX, offsetY, offsetZ));

                // Random Rotation
                dummy.rotateX((rng() - 0.5) * 1.0);
                dummy.rotateY((rng() - 0.5) * 6.28); // Full random Y spin often looks good
                dummy.rotateZ((rng() - 0.5) * 1.0);

                // Random Scale
                const s = 0.8 + rng() * 0.4;
                dummy.scale.setScalar(s);

                dummy.updateMatrix();
                clusterAnchors.push(dummy.matrix.clone());
            }
        });

        // 3. Distribute Emotions
        // Shuffle the abundant leaf positions
        const indices = Array.from({ length: clusterAnchors.length }, (_, i) => i);
        // Fisher-Yates shuffle
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }

        const cTransforms: THREE.Matrix4[] = [];
        // [TextureIndex] -> { transforms, originalIndices }
        const eGroups = Array.from({ length: 5 }, () => ({
            transforms: [] as THREE.Matrix4[],
            originalIndices: [] as number[]
        }));

        const emotionCount = emotions.length;

        for (let i = 0; i < clusterAnchors.length; i++) {
            const mat = clusterAnchors[indices[i]];

            if (i < emotionCount) {
                // It's an Emotion Leaf
                const emIdx = i; // Use 'i' to map to the first 'i' emotions
                const em = emotions[emIdx];

                // Determine Texture Group
                let texIdx = 0;
                if (em?.textureUrl) {
                    const match = em.textureUrl.match(/_0?(\d)\.(png|jpg|jpeg)$/i);
                    if (match) {
                        texIdx = Math.max(0, Math.min(4, parseInt(match[1]) - 1));
                    }
                }

                eGroups[texIdx].transforms.push(mat);
                eGroups[texIdx].originalIndices.push(emIdx);
            } else {
                // It's a Canopy Leaf
                cTransforms.push(mat);
            }
        }

        return {
            branches: treeData.branches,
            canopyTransforms: cTransforms,
            emotionGroups: eGroups,
            instanceLookup: eGroups.map(g => g.originalIndices)
        };
    }, [seed, emotions]);

    // -------------------------------------------------------------------------
    // LIFECYCLE / ANIMATION
    // -------------------------------------------------------------------------

    // Update Matrices when distribution changes
    useLayoutEffect(() => {
        // Canopy Mesh (Index 0 in mapped array logic, or separate)
        // Let's use specific ref for canopy? No, let's just use the array
        // We will render Canopy as the *last* item or explicitly named mesh
    }, [canopyTransforms, emotionGroups]);

    // Animation Loop (GPU Uniforms)
    useFrame((state) => {
        if (isPaused) return;
        const time = state.clock.elapsedTime;

        materialShaderRefs.current.forEach(shader => {
            if (shader) {
                shader.uniforms.uTime.value = time;
                // Update wind params
                const isWindy = windLevel === 'Breezy';
                const speed = isWindy ? 1.5 : 0.8;
                const strength = reduceMotion || windLevel === 'Off' ? 0.0 : (isWindy ? 0.15 : 0.08); // Reduced strength for stability

                shader.uniforms.uWindParams.value.set(speed, strength);
            }
        });
    });

    // -------------------------------------------------------------------------
    // HANDLERS
    // -------------------------------------------------------------------------
    const handleInteract = (e: ThreeEvent<MouseEvent>, type: 'hover' | 'click') => {
        e.stopPropagation();
        if (isCinematic || interactionLock) return;

        // Identify texture group from mesh
        // We'll map the meshes in the render loop.
        // Needs a known order.
        const object = e.object as THREE.InstancedMesh;
        const groupIndex = parseInt(object.userData.groupIndex); // Store index in userData

        if (isNaN(groupIndex)) return;

        const instanceId = e.instanceId;
        if (typeof instanceId !== 'number') return;

        const originalIdx = instanceLookup[groupIndex]?.[instanceId];
        if (originalIdx === undefined || !emotions[originalIdx]) return;

        const emotion = emotions[originalIdx];

        if (type === 'hover') {
            onLeafHover(emotion, e.clientX, e.clientY);
            document.body.style.cursor = 'pointer';
        } else {
            // Click
            setInteractionLock(true);
            setTimeout(() => setInteractionLock(false), 1000);
            soundManager.playClick();

            onLeafClick(emotion);

            const mesh = meshRefs.current[groupIndex]; // Use refs to access mesh

            // Add particles or highlight temporary
            if (mesh && groupRef.current) {
                const dummy = new THREE.Object3D();
                mesh.getMatrixAt(instanceId, dummy.matrix);

                // Create "pop" effect increasing scale temporarily
                const originalMatrix = dummy.matrix.clone();
                dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
                dummy.scale.multiplyScalar(1.2);
                dummy.updateMatrix();
                mesh.setMatrixAt(instanceId, dummy.matrix);
                mesh.instanceMatrix.needsUpdate = true;

                // Restore after 300ms
                setTimeout(() => {
                    if (mesh) {
                        mesh.setMatrixAt(instanceId, originalMatrix);
                        mesh.instanceMatrix.needsUpdate = true;
                    }
                }, 300);

                // Get World Matrix for Transition - Using original matrix to capture correct world pos before pop
                const worldMatrix = originalMatrix.clone().premultiply(mesh.matrixWorld);

                setFocusedLeaf({
                    id: emotion.id,
                    textureIndex: groupIndex,
                    instanceId,
                    matrix: worldMatrix
                });

                const msg = RAW_MESSAGES[Math.floor(Math.random() * RAW_MESSAGES.length)];
                setTimeout(() => setSelectedMessage(msg), 200);
            }

            // Auto unlock if something fails, but HeroLeaf should handle unlocking
        }
    };

    // -------------------------------------------------------------------------
    // RENDER
    // -------------------------------------------------------------------------
    return (
        <group ref={groupRef} position={[0, -2, 0]}>
            {/* 1. BRANCHES (Static InstancedMesh) */}
            <instancedMesh
                args={[branchGeometry, undefined, branches.length]}
                ref={node => {
                    if (node && branches.length > 0) {
                        const dummy = new THREE.Object3D();
                        branches.forEach((b, i) => {
                            const mid = b.start.clone().add(b.end).multiplyScalar(0.5);
                            const dir = b.end.clone().sub(b.start);
                            const len = dir.length();
                            const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
                            dummy.position.copy(mid);
                            dummy.quaternion.copy(q);
                            // Scale Y by length, X/Z by thickness
                            dummy.scale.set(1, len, 1);
                            // Note: Thickness is baked into geometry? No, cylinder is radius 1? 
                            // Geometry is 0.04/0.6. Assuming scale 1 is correct for the intended look. 
                            // Or we scale width? 
                            // Previous code: dummy.scale.set(b.thickness, len, b.thickness);
                            // Protocol says "Altere para CylinderGeometry(...)" which implies fixed size?
                            // But branches usually taper. 
                            // Let's stick to previous scale logic but use new geometry as base.
                            dummy.scale.set(1, len, 1); // Rely on Geometry for tapering
                            dummy.updateMatrix();
                            node.setMatrixAt(i, dummy.matrix);
                        });
                        node.instanceMatrix.needsUpdate = true;
                    }
                }}
            >
                <meshStandardMaterial color="#3E3228" roughness={0.9} />
            </instancedMesh>

            {/* 2. CANOPY (Green Leaves - No Interaction/Texture) */}
            <instancedMesh
                args={[leafGeometry, undefined, canopyTransforms.length]}
                ref={node => {
                    if (node && canopyTransforms.length > 0) {
                        canopyTransforms.forEach((mat, i) => node.setMatrixAt(i, mat));
                        node.instanceMatrix.needsUpdate = true;
                    }
                }}
            >
                <meshStandardMaterial
                    color="#70a060"
                    side={THREE.DoubleSide}
                    transparent
                    alphaTest={0.5}
                    onBeforeCompile={(shader) => {
                        windShaderPatch(shader);
                        materialShaderRefs.current.push(shader);
                    }}
                />
            </instancedMesh>

            {/* 3. EMOTION LEAVES (Textured) */}
            {emotionGroups.map((group, i) => (
                <instancedMesh
                    key={`em-group-${i}`}
                    userData={{ groupIndex: i }}
                    args={[leafGeometry, undefined, group.transforms.length]}
                    ref={node => {
                        if (node) {
                            // Update ref array
                            meshRefs.current[i] = node;
                            // Update matrices
                            if (group.transforms.length > 0) {
                                group.transforms.forEach((mat, idx) => node.setMatrixAt(idx, mat));
                                node.instanceMatrix.needsUpdate = true;
                            }
                        }
                    }}
                    onPointerMove={(e) => handleInteract(e, 'hover')}
                    onPointerOut={() => {
                        document.body.style.cursor = 'auto';
                        onLeafHover(null, 0, 0); // Clear tooltip
                    }}
                    onClick={(e) => handleInteract(e, 'click')}
                >
                    <meshStandardMaterial
                        map={leafMaps[i]}
                        transparent
                        alphaTest={0.5}
                        side={THREE.DoubleSide}
                        onBeforeCompile={(shader) => {
                            windShaderPatch(shader);
                            materialShaderRefs.current.push(shader);
                        }}
                    />
                </instancedMesh>
            ))}
        </group>
    );
});

InstancedTree.displayName = 'InstancedTree';
