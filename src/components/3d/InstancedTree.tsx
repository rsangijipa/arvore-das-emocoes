import React, { useMemo, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import { useOptimizedTextureLoader } from '../../hooks/useOptimizedTextureLoader';
import { soundManager } from '../../utils/SoundManager';
import { useStore } from '../../store/useStore';
import { TREE_CONSTANTS } from '../../constants/3d';
import { resourceManager } from '../../utils/ResourceManager';
import { MaterialFactory } from '../../utils/MaterialFactory';
import type { TreeGenerationResult } from '../../hooks/useTreeGeneration';
import { windShaderPatch, type Shader } from '../../utils/shaders/windShader';
import { RAW_MESSAGES } from '../../data/messages';
import type { EmotionData } from '../../types';

interface InstancedTreeProps {
    treeData: TreeGenerationResult;
    emotions: EmotionData[];
    onLeafClick: (emotion: EmotionData) => void;
    onLeafHover: (emotion: EmotionData | null, x: number, y: number, position?: THREE.Vector3) => void;
    onEmotionsUpdate?: (emotions: EmotionData[]) => void;
    reduceMotion: boolean;
    seed: number;
    isCinematic: boolean;
    windLevel: 'Off' | 'Calm' | 'Breezy';
    isPaused: boolean;
}

// -----------------------------------------------------------------------------
// REUSABLE OBJECTS (GC OPTIMIZATION)
// -----------------------------------------------------------------------------
const _dummy = new THREE.Object3D();
const _quaternion = new THREE.Quaternion();
const _axisY = new THREE.Vector3(0, 1, 0);

// -----------------------------------------------------------------------------
// COMPONENT
// -----------------------------------------------------------------------------
export const InstancedTree: React.FC<InstancedTreeProps> = React.memo(({
    treeData,
    emotions,
    onLeafClick,
    onLeafHover,
    reduceMotion,
    // seed, // Unused? It is passed but internal logic relies on treeData now.
    isCinematic,
    windLevel,
    isPaused
}) => {
    // Refs
    // 0 = Canopy, 1..5 = Emotion Textures
    const meshRefs = useRef<(THREE.InstancedMesh | null)[]>([]);
    const materialShaderRefs = useRef<Shader[]>([]);
    const groupRef = useRef<THREE.Group>(null);

    // Store Actions
    const { setFocusedLeaf, interactionLock, setInteractionLock, setSelectedMessage, deviceInfo } = useStore();

    // Textures
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

    const leafMaps = useOptimizedTextureLoader(textureUrls, deviceInfo.isMobile);

    useEffect(() => {
        leafMaps.forEach(tex => {
            if (tex) { // Check for placeholder validity
                tex.colorSpace = THREE.SRGBColorSpace;
                tex.flipY = false;
            }
        });
    }, [leafMaps]);

    // -------------------------------------------------------------------------
    // GEOMETRIES (Managed)
    // -------------------------------------------------------------------------
    const branchGeometry = useMemo(() => {
        const key = `branch_geo_${deviceInfo.isMobile ? 'mobile' : 'desktop'}`;
        let geo = resourceManager.getGeometry(key);
        if (!geo) {
            geo = new THREE.CylinderGeometry(
                TREE_CONSTANTS.BRANCH.RADIUS_TOP,
                TREE_CONSTANTS.BRANCH.RADIUS_BOTTOM,
                TREE_CONSTANTS.BRANCH.HEIGHT,
                deviceInfo.isMobile ? TREE_CONSTANTS.BRANCH.SEGMENTS_MOBILE : TREE_CONSTANTS.BRANCH.SEGMENTS_DESKTOP
            );
            geo.translate(0, 0.5, 0); // Pivot at base
            resourceManager.registerGeometry(key, geo);
        } else {
            resourceManager.retainGeometry(key);
        }
        return geo;
    }, [deviceInfo.isMobile]);

    const leafGeometry = useMemo(() => {
        const key = 'leaf_geo_plane';
        let geo = resourceManager.getGeometry(key);
        if (!geo) {
            geo = new THREE.PlaneGeometry(
                TREE_CONSTANTS.LEAF.WIDTH,
                TREE_CONSTANTS.LEAF.HEIGHT,
                TREE_CONSTANTS.LEAF.SEGMENTS,
                TREE_CONSTANTS.LEAF.SEGMENTS
            );
            resourceManager.registerGeometry(key, geo);
        } else {
            resourceManager.retainGeometry(key);
        }
        return geo;
    }, []);

    // Cleanup Resources
    useEffect(() => {
        const branchKey = `branch_geo_${deviceInfo.isMobile ? 'mobile' : 'desktop'}`;
        const leafKey = 'leaf_geo_plane';

        return () => {
            resourceManager.releaseGeometry(branchKey);
            resourceManager.releaseGeometry(leafKey);
            materialShaderRefs.current = [];
        };
    }, [deviceInfo.isMobile]);

    // -------------------------------------------------------------------------
    // GENERATION (VIA PROPS)
    // -------------------------------------------------------------------------
    const { branches, simpleLeaves, messageGroups, instanceLookup } = treeData;

    // -------------------------------------------------------------------------
    // LIFECYCLE / ANIMATION
    // -------------------------------------------------------------------------

    // Animation Loop (GPU Uniforms)
    useFrame((state) => {
        if (isPaused) return;
        const time = state.clock.elapsedTime;

        // Clean up nulls occasionally? No, just iterate
        materialShaderRefs.current.forEach(shader => {
            if (shader && shader.uniforms) {
                shader.uniforms.uTime.value = time;

                // Mapping robust to 'Off' casing and checking if config is object
                const windKey = (windLevel === 'Off' ? 'OFF' : windLevel.toUpperCase()) as keyof typeof TREE_CONSTANTS.WIND;
                const rawConfig = TREE_CONSTANTS.WIND[windKey];

                // Ensure rawConfig is an object {speed, strength}
                // (TURBULENCE is a number, so we need to filter it out or use fallback)
                let speed = 0.0;
                let strength = 0.0;

                if (typeof rawConfig === 'object' && rawConfig !== null && 'speed' in rawConfig) {
                    speed = rawConfig.speed;
                    strength = rawConfig.strength;
                } else {
                    // Fallback to Calm if something is weird, or 0 if Off
                    if (windLevel !== 'Off') {
                        speed = TREE_CONSTANTS.WIND.CALM.speed;
                        strength = TREE_CONSTANTS.WIND.CALM.strength;
                    }
                }

                if (reduceMotion || windLevel === 'Off') {
                    strength = 0.0;
                    speed = 0.0; // Optional: keep speed running? No, freeze wind.
                }

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

        const object = e.object as THREE.InstancedMesh;
        const groupIndex = parseInt(object.userData.groupIndex);

        if (isNaN(groupIndex)) return;

        const instanceId = e.instanceId;
        if (typeof instanceId !== 'number') return;

        const originalIdx = instanceLookup[groupIndex]?.[instanceId];
        if (originalIdx === undefined || !emotions[originalIdx]) return;

        const emotion = emotions[originalIdx];

        if (type === 'hover') {
            onLeafHover(emotion, e.clientX, e.clientY, e.point);
            document.body.style.cursor = 'pointer';
        } else {
            // Click
            setInteractionLock(true);
            setTimeout(() => setInteractionLock(false), 1000);
            soundManager.playClick();

            onLeafClick(emotion);

            const mesh = meshRefs.current[groupIndex];

            if (mesh && groupRef.current) {
                // Reuse global dummy for matrix calculations
                mesh.getMatrixAt(instanceId, _dummy.matrix);

                const originalMatrix = _dummy.matrix.clone();
                // Simple pop effect
                _dummy.matrix.decompose(_dummy.position, _dummy.quaternion, _dummy.scale);
                _dummy.scale.multiplyScalar(1.2);
                _dummy.updateMatrix();
                mesh.setMatrixAt(instanceId, _dummy.matrix);
                mesh.instanceMatrix.needsUpdate = true;

                setTimeout(() => {
                    if (mesh) {
                        mesh.setMatrixAt(instanceId, originalMatrix);
                        mesh.instanceMatrix.needsUpdate = true;
                    }
                }, 300);

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
        }
    };

    // -------------------------------------------------------------------------
    // RENDER
    // -------------------------------------------------------------------------
    return (
        <group ref={groupRef} position={[0, -2, 0]}>
            {/* 1. BRANCHES */}
            {/* 1. BRANCHES */}
            <instancedMesh
                castShadow
                receiveShadow
                args={[branchGeometry, undefined, branches.length]}
                ref={node => {
                    if (node && branches.length > 0) {
                        branches.forEach((b, i) => {
                            const mid = b.start.clone().add(b.end).multiplyScalar(0.5);
                            const dir = b.end.clone().sub(b.start);
                            const len = dir.length();

                            // Reused math objects
                            _quaternion.setFromUnitVectors(_axisY, dir.normalize());
                            _dummy.position.copy(mid);
                            _dummy.quaternion.copy(_quaternion);

                            const thickness = b.thickness || TREE_CONSTANTS.BRANCH.RADIUS_BOTTOM;
                            _dummy.scale.set(thickness, len, thickness);
                            _dummy.updateMatrix();
                            node.setMatrixAt(i, _dummy.matrix);
                        });
                        node.instanceMatrix.needsUpdate = true;
                    }
                }}
            >
                <meshStandardMaterial
                    color={TREE_CONSTANTS.BRANCH.COLOR}
                    roughness={TREE_CONSTANTS.BRANCH.ROUGHNESS}
                />
            </instancedMesh>

            {/* 2. SIMPLE LEAVES (Decorative, Green) */}
            <instancedMesh
                castShadow
                receiveShadow
                args={[leafGeometry, undefined, simpleLeaves.length]}
                ref={node => {
                    if (node && simpleLeaves.length > 0) {
                        simpleLeaves.forEach((mat, idx) => node.setMatrixAt(idx, mat));
                        node.instanceMatrix.needsUpdate = true;
                    }
                }}

            >
                {/* Use standardized material but we need to inject shader */}
                <primitive object={MaterialFactory.createSimpleLeafMaterial()} attach="material"
                    onBeforeCompile={(shader: any) => {
                        windShaderPatch(shader);
                        materialShaderRefs.current.push(shader);
                    }}
                />
            </instancedMesh>

            {/* 3. MESSAGE LEAVES (Textured & Interactive) */}
            {messageGroups.map((group, i) => (
                <group key={`msg-group-${i}`}>
                    {/* Visual Mesh */}
                    <instancedMesh
                        userData={{ groupIndex: i }}
                        args={[leafGeometry, undefined, group.transforms.length]}
                        castShadow
                        receiveShadow
                        ref={node => {
                            if (node) {
                                meshRefs.current[i] = node;
                                if (group.transforms.length > 0) {
                                    group.transforms.forEach((mat, idx) => node.setMatrixAt(idx, mat));
                                    node.instanceMatrix.needsUpdate = true;
                                }
                            }
                        }}

                    >
                        {/* Pass texture to factory */}
                        <primitive
                            object={MaterialFactory.createMessageLeafMaterial(leafMaps[i], i)}
                            attach="material"
                            onBeforeCompile={(shader: any) => {
                                windShaderPatch(shader);
                                materialShaderRefs.current.push(shader);
                            }}
                        />
                    </instancedMesh>

                    {/* Interaction Mesh (Invisible Sphere) */}
                    <instancedMesh
                        args={[undefined, undefined, group.transforms.length]}
                        userData={{ groupIndex: i }}
                        ref={node => {
                            if (node && group.transforms.length > 0) {
                                group.transforms.forEach((mat, idx) => node.setMatrixAt(idx, mat));
                                node.instanceMatrix.needsUpdate = true;
                            }
                        }}
                        visible={true}
                        onClick={(e) => handleInteract(e, 'click')}
                        onPointerMove={(e) => handleInteract(e, 'hover')}
                        onPointerOut={() => {
                            document.body.style.cursor = 'auto';
                            onLeafHover(null, 0, 0);
                        }}
                    >
                        <sphereGeometry args={[0.9, 6, 6]} />
                        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
                    </instancedMesh>
                </group>
            ))}
        </group>
    );
});

InstancedTree.displayName = 'InstancedTree';
