import React, { useRef, useLayoutEffect } from 'react';
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
    // t: 0..1
    const easeInOutCubic = (t: number) => {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    };

    const geometry = React.useMemo(() => {
        // Super Prompt: "Formato Anatômico" / "Mapeamento UV Perfeito"
        // Adjust aspect ratio to 1:1.4 to match typical leaf texture
        const geo = new THREE.PlaneGeometry(1, 1.4);
        // UV adjustments can be done here if needed. 
        // Default PlaneGeometry UVs are 0..1 which matches full texture.
        return geo;
    }, []);

    const material = React.useMemo(() => {
        return new THREE.MeshStandardMaterial({
            color: '#ffffff',
            roughness: 0.6,
            metalness: 0.1,
            // alphaMap: leafAlpha, // Still not needed as PNG has alpha
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
            // 1. Capture Initial Transform from Store
            const mat = focusedLeaf.matrix;
            const startPos = new THREE.Vector3();
            const startQuat = new THREE.Quaternion();
            const startScale = new THREE.Vector3();
            mat.decompose(startPos, startQuat, startScale);

            // Set initial state
            meshRef.current.position.copy(startPos);
            meshRef.current.quaternion.copy(startQuat);
            meshRef.current.scale.copy(startScale);
            // Ensure visible start
            meshRef.current.visible = true;

            initialTransformRef.current = { pos: startPos, quat: startQuat, scale: startScale };
            progressRef.current = 0;

            // 2. Set Correct Texture
            const tex = textures[focusedLeaf.textureIndex] || textures[0];
            const textureClone = tex.clone();
            textureClone.colorSpace = THREE.SRGBColorSpace;
            textureClone.flipY = false;

            // Apply Reference Orientation (if needed based on texture UVs)
            // Assuming texture is upright.

            if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
                meshRef.current.material.map = textureClone;
                meshRef.current.material.needsUpdate = true;
            }
        } else {
            // Reset when closed
            progressRef.current = 0;
            initialTransformRef.current = null;
        }
    }, [focusedLeaf, textures]);

    // Animation Loop
    useFrame((state, delta) => {
        if (!focusedLeaf || !meshRef.current || !initialTransformRef.current) return;

        // Calculate Target in real-time (to handle camera movement if any, or just resize)
        // Target: Fixed point in front of camera
        // Distance: Optimized for 60-70% screen height coverage.
        // FOV 45. Distance ~1.5 units fits a 1 unit object well. Leaf is 1.4 height.
        // Distance ~ 1.8 to 2.0 might be better. Let's try 1.8.
        const distance = 1.8;
        const targetNDC = new THREE.Vector3(0, 0, 0.5); // Center screen
        targetNDC.unproject(camera);
        const dir = targetNDC.sub(camera.position).normalize();
        const targetPos = camera.position.clone().add(dir.multiplyScalar(distance));

        // Target Rotation: Parallel to camera (Billboard)
        // Plane looks at -Z by default. We want it to face camera.
        const targetQuat = new THREE.Quaternion();
        const lookAtMat = new THREE.Matrix4();
        // Correct lookAt: object pos, target pos, up.
        // We want object +z to face camera? No, Plane is XY. Normal is +Z.
        // So we want +Z to point to camera.
        lookAtMat.lookAt(targetPos, camera.position, camera.up);
        targetQuat.setFromRotationMatrix(lookAtMat);

        // Adjust for Texture Orientation if needed (e.g. if texture is sideways)
        // Assuming texture is vertical.

        // Target Scale
        const targetScale = new THREE.Vector3(1, 1, 1); // Full size 1x1.4

        // Update Progress
        // Duration: 1.8 seconds
        const duration = 1.8;
        progressRef.current = Math.min(1, progressRef.current + delta / duration);

        const t = easeInOutCubic(progressRef.current);

        // Interpolate
        meshRef.current.position.lerpVectors(initialTransformRef.current.pos, targetPos, t);
        meshRef.current.quaternion.slerpQuaternions(initialTransformRef.current.quat, targetQuat, t);

        // Initial scale might be 0 or small (from InstancedTree). We want to animate to full size.
        // But if we start from InstancedTree scale (which is 0 for focused leaf in my previous logic?? NO.)
        // In InstancedTree, I set the instance scale to 0 when focused.
        // So here we should animate from "small but visible" or just 0 if we want it to grow.
        // Better: Animate from initial captured scale (which was 1.0) to Target Scale.
        // Wait, in InstancedTree, when focused, I set scale to 0. 
        // BUT, I captured the matrix BEFORE setting it to 0. So initialTransformRef has scale 1.
        meshRef.current.scale.lerpVectors(initialTransformRef.current.scale, targetScale, t);

        // Micro-movement (Hover) only when fully arrived (t > 0.95)
        if (t > 0.95) {
            const time = state.clock.elapsedTime;
            meshRef.current.position.y += Math.sin(time * 1.5) * 0.002; // Subtle vertical

            // Subtle rotation
            const sway = new THREE.Quaternion().setFromEuler(new THREE.Euler(
                Math.sin(time * 0.5) * 0.02,
                Math.cos(time * 0.3) * 0.02,
                0
            ));
            meshRef.current.quaternion.multiply(sway);
        }
    });

    const handleDismiss = () => {
        // Logic for reverse animation could be added here or handled by just clearing focusedLeaf
        // For simplicity/robustness, we just clear for now, 
        // but to add "Reverse" we'd need a state machine: 'flying_in' | 'reading' | 'flying_out'
        // For MPV/Super Prompt speed, plain clear is acceptable, but let's try a quick fade out visually?
        // Store controls this.
        setFocusedLeaf(null);
        setSelectedMessage(null);
        setTimeout(() => setInteractionLock(false), 500); // Unlock
    };

    if (!focusedLeaf) return null;

    // Text Fade In Logic
    // Opacity based on progress. Start fading in at 80% (t=0.8).
    // range 0.8 -> 1.0 maps to opacity 0 -> 1
    const textOpacity = progressRef.current > 0.8
        ? (progressRef.current - 0.8) * 5
        : 0;

    return (
        <group>
            {/* The Leaf Mesh */}
            <mesh
                ref={meshRef}
                geometry={geometry}
                material={material}
                onClick={(e) => {
                    e.stopPropagation();
                    handleDismiss(); // Click on leaf to dismiss
                }}
            >
                {/* 
                 Text in World Space tailored for the leaf 
                 Positioned slightly in front z=0.01 
               */}
                {selectedMessage && (
                    <Html
                        transform
                        occlude="blending"
                        // Super Prompt: "offset positivo no eixo Z local (ex: +0.001)"
                        // Increased to 0.1 to be extremely safe against z-fighting as per plan
                        position={[0, 0, 0.1]}
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
                            // Mixing Mode for "Integration" effect
                            // Mixing Mode for "Integration" effect
                            // Super Prompt: "Cor e Contraste: Use uma cor de texto clara"
                            // "Sombra projetada suave"
                            // mixBlendMode: 'normal' often works best for clear reading over complex textures if using shadows
                        }}
                    >
                        <div
                            className="flex flex-col items-center justify-center p-6 text-center"
                            style={{
                                // Ensure text container doesn't overflow leaf excessively
                                width: '100%',
                                // Super Prompt: "backdrop-filter: blur(2px) e fundo semi-transparente"
                                backdropFilter: 'blur(2px)',
                                backgroundColor: 'rgba(0,0,0,0.2)',
                                borderRadius: '12px', // Rounded corners for aesthetics
                            }}
                        >
                            <p
                                className="font-serif text-xl md:text-2xl leading-relaxed"
                                style={{
                                    color: '#ffffff', // White
                                    textShadow: '0 2px 4px rgba(0,0,0,0.8)', // Strong shadow for readability
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

            {/* Fullscreen dismiss area (Click outside) */}
            <mesh
                position={[0, 0, 0]}
                onClick={(e) => {
                    e.stopPropagation();
                    handleDismiss();
                }}
                visible={false} // Invisible raycast target? 
            // Actually, standard HTML overlay handles clicks outside usually, 
            // but in 3D, a big invisible plane behind the leaf works.
            >
                <planeGeometry args={[100, 100]} />
                <meshBasicMaterial visible={false} />
            </mesh>
        </group>
    );
};
