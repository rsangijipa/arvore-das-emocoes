import React, { useMemo, useRef, useLayoutEffect } from 'react';
import { useGLTF, Text, Float } from '@react-three/drei';
import * as THREE from 'three';
import type { EmotionData } from '../../types';

interface MessageLeafProps {
    emotion: EmotionData;
}

// Helper to determine text contrast
const getContrastColor = (hex: string) => {
    const r = parseInt(hex.substr(1, 2), 16);
    const g = parseInt(hex.substr(3, 2), 16);
    const b = parseInt(hex.substr(5, 2), 16);
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
    return yiq >= 128 ? '#3E3228' : '#F9F7F2'; // Dark (Boho Dark) vs Light (Boho BG)
};

export const MessageLeaf: React.FC<MessageLeafProps> = ({ emotion }) => {
    // Load GLB
    const { scene } = useGLTF('/folha.glb');
    const groupRef = useRef<THREE.Group>(null);
    const leafMeshRef = useRef<THREE.Mesh>(null);

    // Deep clone scene to avoid sharing state
    const clone = useMemo(() => scene.clone(true), [scene]);

    // Contrast Color
    const textColor = useMemo(() => getContrastColor(emotion.color), [emotion.color]);

    // Apply color programmatically
    useLayoutEffect(() => {
        clone.traverse((node) => {
            if ((node as THREE.Mesh).isMesh) {
                const mesh = node as THREE.Mesh;
                leafMeshRef.current = mesh;

                // Clone material to ensure unique color instance
                if (mesh.material) {
                    const originalMat = mesh.material as THREE.MeshStandardMaterial;
                    const newMat = originalMat.clone();

                    // Apply tint
                    newMat.color = new THREE.Color(emotion.color).convertSRGBToLinear();

                    // Setup PBR & "Solid" look
                    newMat.transparent = false;
                    newMat.opacity = 1.0;
                    newMat.roughness = 0.5;
                    newMat.metalness = 0.1;

                    // Preserve texture maps ONLY if they exist to keep details
                    if (originalMat.map) newMat.map = originalMat.map;
                    if (originalMat.normalMap) {
                        newMat.normalMap = originalMat.normalMap;
                        newMat.normalScale = new THREE.Vector2(1.5, 1.5); // Enhanced relief
                    }
                    if (originalMat.roughnessMap) newMat.roughnessMap = originalMat.roughnessMap;
                    if (originalMat.aoMap) newMat.aoMap = originalMat.aoMap;

                    mesh.material = newMat;
                    mesh.castShadow = true;
                    mesh.receiveShadow = true;
                }
            }
        });
    }, [clone, emotion.color]);

    return (
        <Float speed={2} rotationIntensity={0.2} floatIntensity={0.2} floatingRange={[-0.1, 0.1]}>
            <group ref={groupRef} rotation={[Math.PI / 8, 0, 0]}> {/* Tilted slightly for viewing */}

                <primitive object={clone} scale={6} /> {/* Slightly larger for detail */}

                {/* 3D Text Group - "Floating" on surface */}
                <group position={[0, 0.2, 0.05]} rotation={[-Math.PI / 8, 0, 0]}>
                    <Text
                        position={[0, 0.2, 0]}
                        fontSize={0.28}
                        color={textColor}
                        anchorX="center"
                        anchorY="bottom"
                        font="https://fonts.gstatic.com/s/playfairdisplay/v30/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvXDXbtM.woff" // Playfair
                        maxWidth={3.5}
                        textAlign="center"
                        letterSpacing={0.05}
                    >
                        {emotion.text}
                    </Text>

                    <Text
                        position={[0, 0.0, 0]}
                        fontSize={0.14}
                        color={textColor}
                        font="https://fonts.gstatic.com/s/montserrat/v25/JTUSjIg1_i6t8kCHKm459Wlhyw.woff" // Montserrat
                        anchorX="center"
                        anchorY="top"
                        maxWidth={3.0}
                        textAlign="center"
                        lineHeight={1.4}
                        fillOpacity={0.9}
                    >
                        "{emotion.reflection}"
                    </Text>
                </group>
            </group>
        </Float>
    );
};

useGLTF.preload('/folha.glb');
