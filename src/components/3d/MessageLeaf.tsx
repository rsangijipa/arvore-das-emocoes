import React, { useMemo, useRef, useLayoutEffect, useEffect } from 'react';
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
    return yiq >= 128 ? '#3E3228' : '#F9F7F2';
};

export const MessageLeaf: React.FC<MessageLeafProps> = ({ emotion }) => {
    // Load GLB
    const gltf = useGLTF('/folha.glb');
    const { scene } = gltf;

    // Debug (only in development)
    useEffect(() => {
        if (import.meta.env.DEV) {
            if (scene) console.log('MessageLeaf: GLB Loaded', scene);
            else console.warn('MessageLeaf: GLB Failed to Load');
        }
    }, [scene]);

    const groupRef = useRef<THREE.Group>(null);

    // Deep clone scene to avoid sharing state across mounts
    // Using simple object clone for scene graph
    const clone = useMemo(() => {
        if (!scene) return null;
        return scene.clone(true);
    }, [scene]);

    // Contrast Color
    const textColor = useMemo(() => getContrastColor(emotion.color), [emotion.color]);

    // Apply color programmatically
    useLayoutEffect(() => {
        if (!clone) return;

        clone.traverse((node) => {
            if ((node as THREE.Mesh).isMesh) {
                const mesh = node as THREE.Mesh;

                // Clone material to ensure unique color instance
                if (mesh.material) {
                    const originalMat = mesh.material as THREE.MeshStandardMaterial; // Assuming standard
                    const newMat = originalMat.clone();

                    // Apply tint
                    newMat.color = new THREE.Color(emotion.color).convertSRGBToLinear();

                    // Setup PBR & "Solid" look
                    newMat.transparent = false;
                    newMat.opacity = 1.0;
                    newMat.roughness = 0.5;
                    newMat.metalness = 0.1;

                    // Preserve texture maps if they exist
                    if (originalMat.map) newMat.map = originalMat.map;
                    if (originalMat.normalMap) {
                        newMat.normalMap = originalMat.normalMap;
                        newMat.normalScale = new THREE.Vector2(1.5, 1.5);
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

    if (!clone) return null;

    return (
        <Float speed={2} rotationIntensity={0.2} floatIntensity={0.2} floatingRange={[-0.1, 0.1]}>
            <ambientLight intensity={2} /> {/* Emergency Lighting */}

            <group ref={groupRef} rotation={[Math.PI / 6, 0, 0]}>
                {/* Scale normalized to 2 as requested */}
                <primitive object={clone} scale={2} position={[0, -0.5, 0]} />

                {/* 3D Text Group - "Floating" on surface */}
                {/* Adjust positions relative to the new scale/position of primitive */}
                <group position={[0, 0, 0.2]} rotation={[-Math.PI / 8, 0, 0]}>
                    <Text
                        position={[0, 0.2, 0]}
                        fontSize={0.25}
                        color={textColor}
                        anchorX="center"
                        anchorY="bottom"
                        font="https://fonts.gstatic.com/s/playfairdisplay/v30/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKdFvXDXbtM.woff"
                        maxWidth={3}
                        textAlign="center"
                    >
                        {emotion.text}
                    </Text>

                    <Text
                        position={[0, -0.1, 0]}
                        fontSize={0.12}
                        color={textColor}
                        font="https://fonts.gstatic.com/s/montserrat/v25/JTUSjIg1_i6t8kCHKm459Wlhyw.woff"
                        anchorX="center"
                        anchorY="top"
                        maxWidth={2.5}
                        textAlign="center"
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
