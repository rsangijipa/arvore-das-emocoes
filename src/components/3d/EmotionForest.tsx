import React, { Suspense, useState, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera, AdaptiveDpr, Loader } from '@react-three/drei';
import { InstancedTree } from './InstancedTree';
import { Effects } from './Effects';
import { UIOverlay } from '../ui/UIOverlay';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { ListView } from '../ui/ListView';
import type { EmotionData } from '../../types';

interface EmotionForestProps {
    emotions: EmotionData[];
    onLeafClick: (emotion: EmotionData) => void;
    onEmotionsUpdate?: (emotions: EmotionData[]) => void;
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

export const EmotionForest: React.FC<EmotionForestProps> = ({ emotions, onLeafClick, onEmotionsUpdate }) => {
    const [seed, setSeed] = useState(() => {
        const params = new URLSearchParams(window.location.search);
        const s = params.get('seed');
        return s ? parseInt(s) : 12345;
    });
    const [quality, setQuality] = useState('Balanced');
    const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);
    const [focusedEmotion, setFocusedEmotion] = useState<EmotionData | null>(null);
    const [reduceMotion, setReduceMotion] = useState(false);

    const handleRegenerate = () => setSeed(Math.random() * 10000);
    const handleLeafHover = (emotion: EmotionData | null, x: number, y: number) => {
        if (emotion) {
            setTooltip({ text: emotion.text, x, y });
        } else {
            setTooltip(null);
        }
    };

    return (
        <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-gradient-to-b from-[#fdfbf7] via-[#f7f3e8] to-[#eaddca]">
            {/* 3D Content */}
            <div className="absolute inset-0 z-0">
                <ErrorBoundary fallback={<ListView emotions={emotions} onLeafClick={onLeafClick} />}>
                    <Canvas
                        shadows
                        dpr={quality === 'Low' ? 1 : [1, 2]}
                        gl={{ antialias: quality === 'High', toneMapping: 3 }}
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
                                onLeafClick={(e) => {
                                    setFocusedEmotion(e);
                                    onLeafClick(e);
                                }}
                                onLeafHover={handleLeafHover}
                                onEmotionsUpdate={onEmotionsUpdate}
                                reduceMotion={reduceMotion}
                                seed={seed}
                            />
                            <OrbitControls
                                makeDefault
                                minPolarAngle={Math.PI / 4}
                                maxPolarAngle={Math.PI / 2 - 0.05}
                                minDistance={20}
                                maxDistance={120}
                                target={focusedEmotion?.position ? [focusedEmotion.position[0], focusedEmotion.position[1], focusedEmotion.position[2]] : [0, 15, 0]}
                                enablePan={false}
                                enableDamping
                                dampingFactor={0.05}
                            />
                            <Effects quality={quality} />
                        </Suspense>
                    </Canvas>
                </ErrorBoundary>
                <Loader />
            </div>

            {/* UI Overlay (Boho) */}
            <UIOverlay
                onRegenerate={handleRegenerate}
                quality={quality}
                onQualityChange={setQuality}
                seed={seed}
                reduceMotion={reduceMotion}
                onReduceMotionChange={setReduceMotion}
            />

            {/* Tooltip Overlay */}
            {tooltip && (
                <div
                    className="fixed z-50 pointer-events-none px-3 py-1.5 bg-white/80 backdrop-blur-md rounded-full border border-boho-clay/10 shadow-lg transition-opacity duration-200"
                    style={{
                        left: tooltip.x,
                        top: tooltip.y - 40,
                        transform: 'translate(-50%, -50%)'
                    }}
                >
                    <span className="text-[10px] font-bold text-boho-clay uppercase tracking-widest whitespace-nowrap">
                        {tooltip.text}
                    </span>
                </div>
            )}
        </div>
    );
};
