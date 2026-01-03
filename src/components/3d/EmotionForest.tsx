import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera, AdaptiveDpr, Loader, Bounds, useBounds } from '@react-three/drei';
import { InstancedTree } from './InstancedTree';
import { Effects } from './Effects';
import { CameraRig } from './CameraRig';
import { LeafCinematicModal } from './LeafCinematicModal';
import { LightParticles } from './LightParticles';
import { UIOverlay } from '../ui/UIOverlay';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { ListView } from '../ui/ListView';
import type { EmotionData } from '../../types';
import { useStore } from '../../store/useStore';

const BoundsHandler = ({ trigger }: { trigger: number }) => {
    const bounds = useBounds();
    React.useEffect(() => {
        bounds.refresh().clip().fit();
    }, [trigger, bounds]);
    return null;
};

export const EmotionForest: React.FC = () => {
    const {
        emotions,
        seed,
        quality,
        reduceMotion,
        isCinematic,
        focusedEmotion,
        setFocusedEmotion,
        setCinematic,
        setEmotions,
        resetCameraTrigger,
        windLevel,
        isPaused
    } = useStore();
    const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

    // Initialize seed from URL if present (once)
    /* useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const s = params.get('seed');
        if (s) setSeed(parseInt(s));
    }, [setSeed]); */

    const handleLeafHover = (emotion: EmotionData | null, x: number, y: number) => {
        if (isCinematic) return; // Disable tooltip in cinematic mode
        if (emotion) {
            setTooltip({ text: emotion.text, x, y });
        } else {
            setTooltip(null);
        }
    };

    const handleLeafClickInternal = (emotion: EmotionData) => {
        setFocusedEmotion(emotion);
        setCinematic(true);
    };

    return (
        <div className="fixed inset-0 w-screen h-screen overflow-hidden bg-gradient-to-b from-[#fdfbf7] via-[#f7f3e8] to-[#eaddca]">
            {/* 3D Content */}
            <div className="absolute inset-0 z-0">
                <ErrorBoundary fallback={<ListView emotions={emotions} onLeafClick={handleLeafClickInternal} />}>
                    <Canvas
                        shadows
                        dpr={quality === 'Low' ? 1 : [1, 2]}
                        gl={{ antialias: quality === 'High', toneMapping: 3 }}
                        style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }} // Explicit inline style
                    >
                        <PerspectiveCamera makeDefault position={[0, 20, 70]} fov={45} />

                        <AdaptiveDpr />
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
                            {/* @ts-ignore */}
                            <Bounds observe margin={1.2} clip damping={6} fit>
                                <BoundsHandler trigger={resetCameraTrigger} />
                                <InstancedTree
                                    emotions={emotions}
                                    onLeafClick={handleLeafClickInternal}
                                    onLeafHover={handleLeafHover}
                                    onEmotionsUpdate={setEmotions}
                                    reduceMotion={reduceMotion}
                                    seed={seed}
                                    isCinematic={isCinematic}
                                    windLevel={windLevel}
                                    isPaused={isPaused}
                                />
                            </Bounds>
                            <OrbitControls
                                makeDefault
                                enabled={!isCinematic}
                                minPolarAngle={Math.PI / 4}
                                maxPolarAngle={Math.PI / 2 - 0.05}
                                minDistance={20}
                                maxDistance={150}
                                target={[0, 15, 0]} // Center of canopy approx
                                enablePan={false}
                                enableDamping
                                dampingFactor={0.08}
                            />
                            <CameraRig
                                isCinematic={isCinematic}
                                targetPosition={focusedEmotion?.position}
                            />
                            {quality !== 'Low' && <LightParticles />}
                            <Effects quality={quality} isCinematic={isCinematic} />
                        </Suspense>
                    </Canvas>
                </ErrorBoundary>
                <Loader />
            </div>

            {/* Cinematic Modal (Renders on top when active) */}
            {isCinematic && <LeafCinematicModal />}

            {/* UI Overlay (Main) - Hide when cinematic? Or let Modal handle its own UI */}
            {!isCinematic && <UIOverlay />}

            {/* Tooltip Overlay */}
            {tooltip && !isCinematic && (
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
