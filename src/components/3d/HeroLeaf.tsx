import React, { useRef, useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture, Html } from '@react-three/drei';
import { useStore } from '../../store/useStore';

export const HeroLeaf: React.FC = () => {
    const focusedLeaf = useStore(state => state.focusedLeaf);
    const selectedMessage = useStore(state => state.selectedMessage);
    const setFocusedLeaf = useStore(state => state.setFocusedLeaf);
    const setSelectedMessage = useStore(state => state.setSelectedMessage);
    const setInteractionLock = useStore(state => state.setInteractionLock);

    // Refs for animation state
    const meshRef = useRef<THREE.Mesh>(null);
    const { camera } = useThree();
    const progressRef = useRef(0);
    const initialTransformRef = useRef<{ pos: THREE.Vector3, quat: THREE.Quaternion, scale: THREE.Vector3 } | null>(null);

    // Easing Function: EaseInOutCubic
    const easeInOutCubic = (t: number) => {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const geometry = useMemo(() => {
        // Super Prompt: "Alterar PlaneGeometry para proporção mais retangular (ex: 1:1.5)"
        // User requested 1.2, 1.8
        return new THREE.PlaneGeometry(1.2, 1.8);
    }, []);

    const material = useMemo(() => {
        return new THREE.MeshStandardMaterial({
            color: '#ffffff',
            roughness: 0.6,
            metalness: 0.1,
            // alphaMap removed per instructions for full texture usage
            transparent: true,
            alphaTest: 0.5,
            side: THREE.DoubleSide
        });
    }, []);

    const textureUrls = [
        '/textures/leaves/leaf_tex_01.png',
        '/textures/leaves/leaf_tex_02.png',
        '/textures/leaves/leaf_tex_03.png',
        '/textures/leaves/leaf_tex_04.png',
        '/textures/leaves/leaf_tex_05.png'
    ];
    const textures = useTexture(textureUrls);

    // Initialize Animation State when focusedLeaf changes
    useLayoutEffect(() => {
        if (focusedLeaf && meshRef.current) {
            const mat = focusedLeaf.matrix;
            const startPos = new THREE.Vector3();
            const startQuat = new THREE.Quaternion();
            const startScale = new THREE.Vector3();
            mat.decompose(startPos, startQuat, startScale);

            meshRef.current.position.copy(startPos);
            meshRef.current.quaternion.copy(startQuat);
            meshRef.current.scale.copy(startScale);
            meshRef.current.visible = true;

            initialTransformRef.current = { pos: startPos, quat: startQuat, scale: startScale };
            progressRef.current = 0;

            const tex = textures[focusedLeaf.textureIndex] || textures[0];
            const textureClone = tex.clone();
            textureClone.colorSpace = THREE.SRGBColorSpace;
            textureClone.flipY = false;

            if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
                meshRef.current.material.map = textureClone;
                meshRef.current.material.needsUpdate = true;
            }
        } else {
            progressRef.current = 0;
            initialTransformRef.current = null;
        }
    }, [focusedLeaf, textures]);

    // Animation Loop
    useFrame((state, delta) => {
        if (!focusedLeaf || !meshRef.current || !initialTransformRef.current) return;

        const distance = 1.8;
        const targetNDC = new THREE.Vector3(0, 0, 0.5); // Center screen
        targetNDC.unproject(camera);
        const dir = targetNDC.sub(camera.position).normalize();
        const targetPos = camera.position.clone().add(dir.multiplyScalar(distance));

        const targetQuat = new THREE.Quaternion();
        const lookAtMat = new THREE.Matrix4();
        lookAtMat.lookAt(targetPos, camera.position, camera.up);
        targetQuat.setFromRotationMatrix(lookAtMat);

        const targetScale = new THREE.Vector3(1, 1, 1);
        const duration = 1.8;
        progressRef.current = Math.min(1, progressRef.current + delta / duration);
        const t = easeInOutCubic(progressRef.current);

        meshRef.current.position.lerpVectors(initialTransformRef.current.pos, targetPos, t);
        meshRef.current.quaternion.slerpQuaternions(initialTransformRef.current.quat, targetQuat, t);
        meshRef.current.scale.lerpVectors(initialTransformRef.current.scale, targetScale, t);

        if (t > 0.95) {
            const time = state.clock.elapsedTime;
            meshRef.current.position.y += Math.sin(time * 1.5) * 0.002;
            const sway = new THREE.Quaternion().setFromEuler(new THREE.Euler(
                Math.sin(time * 0.5) * 0.02,
                Math.cos(time * 0.3) * 0.02,
                0
            ));
            meshRef.current.quaternion.multiply(sway);
        }
    });

    const handleDismiss = () => {
        setFocusedLeaf(null);
        setSelectedMessage(null);
        setTimeout(() => setInteractionLock(false), 500);
    };

    if (!focusedLeaf) return null;

    const textOpacity = progressRef.current > 0.8 ? (progressRef.current - 0.8) * 5 : 0;

    return (
        <group>
            <mesh
                ref={meshRef}
                geometry={geometry}
                material={material}
                onClick={(e) => {
                    e.stopPropagation();
                    handleDismiss();
                }}
            >
                {selectedMessage && (
                    <Html
                        transform
                        occlude="blending"
                        // Super Prompt: "aumente a distância ... para 0.2"
                        position={[0, 0, 0.2]}
                        // Super Prompt: "gire o container ... 180 graus"
                        rotation={[0, Math.PI, 0]}
                        style={{
                            width: '320px',
                            pointerEvents: 'none',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            textAlign: 'center',
                            opacity: textOpacity,
                            transition: 'opacity 0.2s',
                            userSelect: 'none',
                        }}
                    >
                        <div
                            className="flex flex-col items-center justify-center text-center"
                            style={{
                                width: '100%',
                                // Super Prompt: "fundo semi-transparente ... blur(4px)"
                                backdropFilter: 'blur(4px)',
                                backgroundColor: 'rgba(0,0,0,0.4)',
                                borderRadius: '12px',
                                padding: '16px',
                            }}
                        >
                            <p
                                className="font-serif text-xl md:text-2xl leading-relaxed"
                                style={{
                                    color: '#ffffff',
                                    textShadow: '0 2px 4px rgba(0,0,0,0.8)',
                                    fontWeight: 600,
                                    margin: 0
                                }}
                            >
                                "{selectedMessage.text}"
                            </p>
                            {selectedMessage.author && (
                                <p
                                    className="text-xs mt-3 font-sans tracking-[0.2em] uppercase"
                                    style={{
                                        color: 'rgba(255,255,255,0.8)',
                                        textShadow: '0 1px 4px rgba(0,0,0,0.5)'
                                    }}
                                >
                                    — {selectedMessage.author}
                                </p>
                            )}
                            <p className="mt-8 text-[9px] uppercase tracking-widest opacity-50 text-white">
                                Toque para devolver
                            </p>
                        </div>
                    </Html>
                )}
            </mesh>
            <mesh
                position={[0, 0, 0]}
                onClick={(e) => {
                    e.stopPropagation();
                    handleDismiss();
                }}
                visible={false}
            >
                <planeGeometry args={[100, 100]} />
                <meshBasicMaterial visible={false} />
            </mesh>
        </group>
    );
};
