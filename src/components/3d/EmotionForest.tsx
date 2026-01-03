import React, { Suspense, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera, AdaptiveDpr, Loader, Bounds, useBounds } from '@react-three/drei';
import { InstancedTree } from './InstancedTree';
import { Effects } from './Effects';
import { CameraRig } from './CameraRig';
import { Background360 } from '../scene/Background360';
import { LeafCinematicModal } from './LeafCinematicModal';
import { LightParticles } from './LightParticles';
import { UIOverlay } from '../ui/UIOverlay';
import { BottomNav } from '../ui/BottomNav';
import { LeafQuoteOverlay } from '../ui/LeafQuoteOverlay';
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
        setEmotions,
        resetCameraTrigger,
        activeTab,
        windLevel,
        isPaused
    } = useStore();
    const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

    const handleLeafHover = (emotion: EmotionData | null, x: number, y: number) => {
        if (isCinematic || activeTab !== 'home') return;
        if (emotion) {
            setTooltip({ text: emotion.text, x, y });
        } else {
            setTooltip(null);
        }
    };

    const handleLeafClickInternal = (emotion: EmotionData) => {
        if (activeTab !== 'home') return;
        setFocusedEmotion(emotion);
        setCinematic(true);
    };

    return (
        <div
            className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#22190c] flex items-center justify-center p-0 md:p-6"
            style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
        >
            {/* Dynamic Window Container */}
            <div className="relative w-full h-full rounded-none md:rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] border-0 md:border-[1px] border-white/10 bg-gradient-to-b from-[#2a2218] to-[#1a150e]">

                {/* 3D Content Wrapper */}
                <div className={`absolute inset-0 z-0 transition-opacity duration-1000 ${activeTab === 'explore' ? 'opacity-80' : 'opacity-100'}`}>
                    <ErrorBoundary fallback={<ListView emotions={emotions} onLeafClick={handleLeafClickInternal} />}>
                        <Canvas
                            shadows
                            dpr={quality === 'Low' ? 1 : [1, 2]}
                            gl={{ antialias: quality === 'High', toneMapping: 3 }}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                        >
                            <PerspectiveCamera makeDefault position={[0, 20, 70]} fov={45} />

                            <AdaptiveDpr />

                            <Background360 showSphereFallback={quality === 'Low'} />
                            <Environment preset="forest" />

                            {/* Magical Lighting */}
                            <directionalLight
                                position={[20, 50, 20]}
                                intensity={1.5}
                                castShadow
                                shadow-mapSize={[1024, 1024]}
                                color="#e9ce98"
                            />
                            <hemisphereLight intensity={0.4} color="#cea86c" groundColor="#22190c" />
                            <fog attach="fog" args={['#22190c', 40, 150]} />

                            <Suspense fallback={null}>
                                {/* @ts-expect-error - Bounds library mismatch */}
                                <Bounds observe margin={1.2} clip damping={6} fit>
                                    <BoundsHandler trigger={resetCameraTrigger} />
                                    <InstancedTree
                                        emotions={emotions}
                                        onLeafClick={handleLeafClickInternal}
                                        onLeafHover={handleLeafHover}
                                        onEmotionsUpdate={setEmotions}
                                        reduceMotion={reduceMotion}
                                        seed={seed}
                                        isCinematic={isCinematic || activeTab !== 'home'}
                                        windLevel={windLevel}
                                        isPaused={isPaused}
                                    />
                                </Bounds>
                                <OrbitControls
                                    makeDefault
                                    enabled={!isCinematic && activeTab === 'home'}
                                    minPolarAngle={Math.PI / 4}
                                    maxPolarAngle={Math.PI / 2 - 0.05}
                                    minDistance={25}
                                    maxDistance={120}
                                    target={[0, 18, 0]}
                                    enablePan={false}
                                    enableDamping
                                    dampingFactor={0.05}
                                    autoRotate={activeTab === 'explore'}
                                    autoRotateSpeed={0.4}
                                />
                                <CameraRig
                                    isCinematic={isCinematic}
                                    targetPosition={focusedEmotion?.position}
                                />
                                {quality !== 'Low' && <LightParticles />}
                                <Effects quality={quality} isCinematic={isCinematic || activeTab !== 'home'} />
                            </Suspense>
                        </Canvas>
                    </ErrorBoundary>
                    <Loader />
                </div>

                {/* Overlays */}
                {isCinematic && (
                    <ErrorBoundary fallback={<div className="text-white p-4">Erro ao carregar folha</div>}>
                        <LeafCinematicModal />
                    </ErrorBoundary>
                )}
                <LeafQuoteOverlay />

                {/* Main Navigation - Elegant Light Mode */}
                {!isCinematic && <BottomNav />}

                {/* Control Panel - Elegant Light Mode */}
                {!isCinematic && activeTab === 'home' && <UIOverlay />}

                {/* Tooltip */}
                {tooltip && !isCinematic && activeTab === 'home' && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="fixed z-50 pointer-events-none px-4 py-2 bg-white/95 backdrop-blur-xl rounded-2xl border border-white shadow-xl"
                        style={{
                            left: tooltip.x,
                            top: tooltip.y - 50,
                            transform: 'translateX(-50%)'
                        }}
                    >
                        <span className="text-[11px] font-black text-gray-800 uppercase tracking-widest whitespace-nowrap">
                            {tooltip.text}
                        </span>
                    </motion.div>
                )}
            </div>
        </div>
    );
};
