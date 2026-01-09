import React, { useMemo, useRef } from 'react';
import { Text, Float } from '@react-three/drei';
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

// Procedural Alpha Map for Leaf Shape
const generateLeafAlpha = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');
    if (ctx) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, 512, 512);
        ctx.fillStyle = '#ffffff';
        ctx.translate(256, 256);
        ctx.beginPath();
        ctx.moveTo(0, -240);
        ctx.bezierCurveTo(160, -120, 160, 120, 0, 240);
        ctx.bezierCurveTo(-160, 120, -160, -120, 0, -240);
        ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    return tex;
};

const leafAlpha = generateLeafAlpha();

export const MessageLeaf: React.FC<MessageLeafProps> = ({ emotion }) => {
    const groupRef = useRef<THREE.Group>(null);
    const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1.4), []);

    // Contrast Color
    const textColor = useMemo(() => getContrastColor(emotion.color), [emotion.color]);

    const material = useMemo(() => {
        return new THREE.MeshStandardMaterial({
            color: new THREE.Color(emotion.color).convertSRGBToLinear(),
            roughness: 0.5,
            metalness: 0.1,
            alphaMap: leafAlpha,
            transparent: true,
            alphaTest: 0.5,
            side: THREE.DoubleSide
        });
    }, [emotion.color]);

    return (
        <Float speed={2} rotationIntensity={0.2} floatIntensity={0.2} floatingRange={[-0.1, 0.1]}>
            <ambientLight intensity={1} />

            <group ref={groupRef} rotation={[Math.PI / 6, 0, 0]}>
                <mesh geometry={geometry} material={material} scale={2.5} position={[0, -0.5, 0]} />

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
