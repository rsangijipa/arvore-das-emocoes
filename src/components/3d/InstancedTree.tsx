import React, { useMemo, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { useFrame, useLoader, type ThreeEvent } from '@react-three/fiber';
import { generateProceduralTree } from '../../utils/treeGenerator';
import { soundManager } from '../../utils/SoundManager';
import { useStore } from '../../store/useStore';
import { RAW_MESSAGES } from '../../data/messages';
import type { EmotionData } from '../../types';
import { createRng } from '../../utils/random';

interface InstancedTreeProps {
    emotions: EmotionData[];
    onLeafHover: (emotion: EmotionData | null, x: number, y: number) => void;
    onEmotionsUpdate?: (emotions: EmotionData[]) => void;
    reduceMotion: boolean;
    seed: number;
    isCinematic: boolean;
    windLevel: 'Off' | 'Calm' | 'Breezy';
    isPaused: boolean;
}

// GPU Wind Shader Patch
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
        
        // Wind Logic
        float windSpeed = uWindParams.x;
        float windStrength = uWindParams.y;
        
        // Only apply if wind is enabled (strength > 0)
        if (windStrength > 0.001) {
             // Instance-based randomization (approximate using world position)
             vec4 worldPos = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
             float phase = worldPos.x * 0.5 + worldPos.z * 0.3;
             
             // Flutter (High frequency)
             float flutter = sin(uTime * 3.0 + phase * 2.0) * 0.05 * windStrength;
             
             // Sway (Low frequency)
             float sway = sin(uTime * 0.5 * windSpeed + phase) * 0.2 * windStrength;
             
             // Apply based on Y (height influence) - assume leaf origin is bottom
             float influence = smoothstep(0.0, 1.0, position.y + 0.5); // Adjust based on geometry centering
             
             transformed.x += sway * influence + flutter;
             transformed.z += flutter;
             
             // Rotation approximation
             float angle = sway * 0.5;
             float c = cos(angle);
             float s = sin(angle);
             // Rotate around Z axis roughly
             float tx = transformed.x * c - transformed.y * s;
             float ty = transformed.x * s + transformed.y * c;
             transformed.x = tx;
             transformed.y = ty;
        }
        `
    );
};

export const InstancedTree: React.FC<InstancedTreeProps> = React.memo(({ emotions, onLeafHover, reduceMotion, seed, isCinematic, windLevel, isPaused }) => {
    // Refs
    const canopyMeshRef = useRef<THREE.InstancedMesh>(null);
    const emotionMeshRefs = useRef<(THREE.InstancedMesh | null)[]>([]);
    const materialShaderRefs = useRef<any[]>([]); // To update uniforms
    const groupRef = useRef<THREE.Group>(null);

    // Stats
    // const deviceInfo = useStore(state => state.deviceInfo);

    // Actions
    // Actions
    const { setFocusedLeaf, interactionLock, setInteractionLock, setSelectedMessage } = useStore();
    // const [hoveredEmotionIndex, setHoveredEmotionIndex] = useState<number | null>(null);

    // Assets
    const textureUrls = useMemo(() => [
        '/textures/leaves/leaf_tex_01.png',
        '/textures/leaves/leaf_tex_02.png',
        '/textures/leaves/leaf_tex_03.png',
        '/textures/leaves/leaf_tex_04.png',
        '/textures/leaves/leaf_tex_05.png'
    ], []);

    // Load Textures (Memoized)
    const leafMaps = useLoader(THREE.TextureLoader, textureUrls);

    // Verify Texture Settings Once
    useLayoutEffect(() => {
        leafMaps.forEach(tex => {
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.flipY = false;
        });
    }, [leafMaps]);

    // Geometries
    const branchGeometry = useMemo(() => new THREE.CylinderGeometry(0.03, 0.6, 1, 5), []);
    // Move base up
    useMemo(() => branchGeometry.translate(0, 0.5, 0), [branchGeometry]);

    const leafGeometry = useMemo(() => new THREE.PlaneGeometry(1.2, 1.8), []);
    // Center geometry so rotation happens at stem?
    // Plane is centered by default. Move up by half height so 0,0 is bottom
    // Leaf height 1.8 -> Move y +0.9
    // BUT our Procedural Generator assumes center/tips. Let's keep centered but use pivot logic or keep simple.
    // The previous implementation used centered logic.

    // --- GENERATION ---
    const { branches, leafAnchors } = useMemo(() => {
        // Expensive calculation - run only when seed changes
        return generateProceduralTree(seed);
    }, [seed]);

    // Process Distributions
    const { canopyTransforms, emotionGroups, instanceLookup } = useMemo(() => {
        const rng = createRng(seed);
        const indices = Array.from({ length: leafAnchors.length }, (_, i) => i);
        // Shuffle
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }

        const emotionCount = Math.min(emotions.length, leafAnchors.length);
        const cTransforms: THREE.Matrix4[] = [];
        const eGroups: { transforms: THREE.Matrix4[], originalIndices: number[] }[] = Array.from({ length: 5 }, () => ({ transforms: [], originalIndices: [] }));

        const dummy = new THREE.Object3D();
        const jitterRng = createRng(seed * 2);

        for (let i = 0; i < leafAnchors.length; i++) {
            const anchorMat = leafAnchors[indices[i]];
            dummy.matrix.copy(anchorMat);
            dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);

            // Jitter
            dummy.position.addScalar((jitterRng() - 0.5) * 0.4);
            dummy.rotation.x += (jitterRng() - 0.5) * 0.5;
            dummy.rotation.y += (jitterRng() - 0.5) * 0.5;
            dummy.rotation.z += (jitterRng() - 0.5) * 0.5;
            // Uniform Scale
            const s = 0.8 + jitterRng() * 0.4;
            dummy.scale.setScalar(s);
            dummy.updateMatrix();

            if (i < emotionCount) {
                // Emotion Leaf
                const emIdx = i;
                const em = emotions[emIdx];
                let texIdx = 0;
                if (em?.textureUrl) {
                    const match = em.textureUrl.match(/_0?(\d)\.png$/i) || em.textureUrl.match(/_0?(\d)\.jpg$/i); // supports both
                    if (match) texIdx = Math.max(0, Math.min(4, parseInt(match[1]) - 1));
                }

                eGroups[texIdx].transforms.push(dummy.matrix.clone());
                eGroups[texIdx].originalIndices.push(emIdx);
            } else {
                // Canopy Leaf
                cTransforms.push(dummy.matrix.clone());
            }
        }

        return { canopyTransforms: cTransforms, emotionGroups: eGroups, instanceLookup: eGroups.map(g => g.originalIndices) };
    }, [leafAnchors, seed, emotions]);

    useLayoutEffect(() => {
        // const dummy = new THREE.Object3D();

        // Canopy
        if (canopyMeshRef.current) {
            canopyTransforms.forEach((mat, i) => {
                canopyMeshRef.current!.setMatrixAt(i, mat);
            });
            canopyMeshRef.current.instanceMatrix.needsUpdate = true;
        }

        // Emotions
        emotionGroups.forEach((group, gIdx) => {
            const mesh = emotionMeshRefs.current[gIdx];
            if (mesh) {
                group.transforms.forEach((mat, i) => {
                    mesh.setMatrixAt(i, mat);
                });
                mesh.instanceMatrix.needsUpdate = true;
            }
        });

    }, [canopyTransforms, emotionGroups]); // Only update if distribution changes

    // Animation Loop (GPU Uniforms Only)
    useFrame((state) => {
        if (isPaused) return;
        const time = state.clock.elapsedTime;

        // Update Shader Uniforms
        materialShaderRefs.current.forEach(shader => {
            if (shader) {
                shader.uniforms.uTime.value = time;
                // Update wind params if needed dynamic
                shader.uniforms.uWindParams.value.set(
                    reduceMotion ? 0.0 : (windLevel === 'Breezy' ? 1.5 : 0.8), // Speed
                    reduceMotion ? 0.0 : (windLevel === 'Off' ? 0.0 : 0.1)     // Strength
                );
            }
        });
    });

    // Interaction Handler
    const handleInteract = (e: ThreeEvent<MouseEvent>, type: 'hover' | 'click') => {
        e.stopPropagation();
        if (isCinematic || interactionLock) return;

        // Use findIndex to identify group
        const gIdx = emotionMeshRefs.current.indexOf(e.object as THREE.InstancedMesh);
        if (gIdx === -1 || typeof e.instanceId !== 'number') return;

        const instanceId = e.instanceId;
        const originalIdx = instanceLookup[gIdx]?.[instanceId];

        if (originalIdx === undefined || !emotions[originalIdx]) return;

        const emotion = emotions[originalIdx];

        if (type === 'hover') {
            onLeafHover(emotion, e.clientX, e.clientY);
            // setHoveredEmotionIndex(originalIdx);
            document.body.style.cursor = 'pointer';
        } else {
            // Click
            setInteractionLock(true);
            setTimeout(() => setInteractionLock(false), 1000);
            soundManager.playClick();

            // Get World Matrix for Hero Transition
            const dummy = new THREE.Object3D();
            const mesh = emotionMeshRefs.current[gIdx];
            if (mesh && groupRef.current) {
                mesh.getMatrixAt(instanceId, dummy.matrix);
                const worldMatrix = dummy.matrix.clone().premultiply(groupRef.current.matrixWorld);

                setFocusedLeaf({
                    id: emotion.id,
                    textureIndex: gIdx, // This relies on the index 0-4 matching texture array
                    instanceId,
                    matrix: worldMatrix
                });

                // Show message delayed
                const msg = RAW_MESSAGES[Math.floor(Math.random() * RAW_MESSAGES.length)];
                setTimeout(() => setSelectedMessage(msg), 200);
            }
        }
    };

    return (
        <group ref={groupRef} position={[0, -2, 0]}> {/* Simple grounded position for now */}

            {/* Branches (Static) */}
            <instancedMesh
                args={[undefined, undefined, branches.length]}
                ref={node => {
                    // Init branches once
                    if (node && branches.length > 0) {
                        const dummy = new THREE.Object3D();
                        branches.forEach((b, i) => {
                            const mid = b.start.clone().add(b.end).multiplyScalar(0.5);
                            const dir = b.end.clone().sub(b.start);
                            const len = dir.length();
                            const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
                            dummy.position.copy(mid);
                            dummy.quaternion.copy(q);
                            dummy.scale.set(b.thickness, len, b.thickness);
                            dummy.updateMatrix();
                            node.setMatrixAt(i, dummy.matrix);
                        });
                        node.instanceMatrix.needsUpdate = true;
                    }
                }}
            >
                <cylinderGeometry args={[0.03, 0.6, 1, 5]} />
                <meshStandardMaterial color="#3E3228" roughness={0.9} />
            </instancedMesh>

            {/* Canopy (Procedural Leaves) */}
            <instancedMesh
                ref={canopyMeshRef}
                args={[leafGeometry, undefined, canopyTransforms.length]}
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

            {/* Emotions (5 Texture Groups) */}
            {emotionGroups.map((group, i) => (
                <instancedMesh
                    key={`em-group-${i}`}
                    ref={el => emotionMeshRefs.current[i] = el}
                    args={[leafGeometry, undefined, group.transforms.length]}
                    onPointerMove={(e) => handleInteract(e, 'hover')}
                    onPointerOut={() => { /* setHoveredEmotionIndex(null); */ document.body.style.cursor = 'auto'; }}
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
