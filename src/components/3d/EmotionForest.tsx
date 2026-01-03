import React, { Suspense, useState, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera, AdaptiveDpr, Loader } from '@react-three/drei';
import { InstancedTree } from './InstancedTree';
import { Effects } from './Effects';
import { UIOverlay } from '../ui/UIOverlay';
import type { EmotionData } from '../../types';

interface EmotionForestProps {
    emotions: EmotionData[];
    onLeafClick: (emotion: EmotionData) => void;
}

const FullScreenFix = () => {
    // Quick hack to force canvas parent to behave if CSS fails
    const { gl } = useThree();
    useEffect(() => {
        const canvas = gl.domElement;
        const parent = canvas.parentElement;
        if (parent) {
            parent.style.width = '100%';
            parent.style.height = '100%';
            parent.style.position = 'absolute';
            parent.style.top = '0';
            parent.style.left = '0';
        }
    }, [gl]);
    return null;
};

export const EmotionForest: React.FC<EmotionForestProps> = ({ emotions, onLeafClick }) => {
    const [seed, setSeed] = useState(12345);
    const handleRegenerate = () => setSeed(Math.random() * 10000);

    return (
        <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-gradient-to-b from-[#fdfbf7] via-[#f7f3e8] to-[#eaddca]">
            {/* 3D Content */}
            <div className="absolute inset-0 z-0">
                <Canvas
                    shadows
                    dpr={[1, 2]}
                    gl={{ antialias: false, toneMapping: 3 }}
                    style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} // Explicit inline style
                >
                    <PerspectiveCamera makeDefault position={[0, 20, 70]} fov={45} />
                    <FullScreenFix />

                    <AdaptiveDpr pixelated />
                    <Environment preset="sunset" background blur={0.8} /> {/* Sunset = Warmer light */}

                    <directionalLight
                        position={[20, 50, 20]}
                        intensity={2.2}
                        castShadow
                        shadow-mapSize={[1024, 1024]}
                        color="#fffaf0" // Warm light
                    />
                    <hemisphereLight intensity={0.6} color="#ffe4e1" groundColor="#8b4513" /> // Pinkish sky, brown ground
                    <fog attach="fog" args={['#eaddca', 30, 120]} />

                    <Suspense fallback={null}>
                        <InstancedTree
                            emotions={emotions}
                            onLeafClick={onLeafClick}
                            seed={seed}
                        />
                        <OrbitControls
                            minPolarAngle={Math.PI / 4}
                            maxPolarAngle={Math.PI / 2 - 0.05}
                            minDistance={20}
                            maxDistance={120}
                            target={[0, 15, 0]}
                            enablePan={false}
                        />
                        <Effects />
                    </Suspense>
                </Canvas>
                <Loader />
            </div>

            {/* UI Overlay (Boho) */}
            <UIOverlay onRegenerate={handleRegenerate} />
        </div>
    );
};
