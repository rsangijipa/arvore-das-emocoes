import React, { Suspense, useState, lazy } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera, AdaptiveDpr, Loader, Html } from '@react-three/drei';
import { motion } from "framer-motion";
import { InstancedTree } from './InstancedTree';
// import { Effects } from './Effects';
import { HeroLeaf } from './HeroLeaf';
import { CameraRig } from './CameraRig';
import { Background360 } from '../scene/Background360';
import { UIOverlay } from '../ui/UIOverlay';
import { BottomNav } from '../ui/BottomNav';
import { LeafQuoteOverlay } from '../ui/LeafQuoteOverlay';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { ListView } from '../ui/ListView';
import { ArrowLeft } from 'lucide-react';
import type { EmotionData } from '../../types';
import { useStore } from '../../store/useStore';
import { MessageCard } from '../ui/MessageCard';

// Lazy load heavy components for better code splitting
const LightParticles = lazy(() => import('./LightParticles').then(module => ({ default: module.LightParticles })));



export const EmotionForest: React.FC = () => {
    const emotions = useStore(state => state.emotions);
    const seed = useStore(state => state.seed);
    const quality = useStore(state => state.quality);
    const reduceMotion = useStore(state => state.reduceMotion);
    const isCinematic = useStore(state => state.isCinematic);
    const setCinematic = useStore(state => state.setCinematic);
    const focusedEmotion = useStore(state => state.focusedEmotion);
    const setFocusedEmotion = useStore(state => state.setFocusedEmotion);
    const setEmotions = useStore(state => state.setEmotions);
    const activeTab = useStore(state => state.activeTab);
    const windLevel = useStore(state => state.windLevel);
    const isPaused = useStore(state => state.isPaused);
    const deviceInfo = useStore(state => state.deviceInfo);
    const [tooltip, setTooltip] = useState<{ text: string; x: number; y: number } | null>(null);

    const handleLeafHover = React.useCallback((emotion: EmotionData | null, x: number, y: number) => {
        // Disable tooltip if a leaf is focused
        if (isCinematic || activeTab !== 'home' || focusedEmotion) {
            setTooltip(null);
            return;
        }

        if (emotion) {
            setTooltip({ text: emotion.subcategory || emotion.category, x, y });
        } else {
            setTooltip(null);
        }
    }, [isCinematic, activeTab, focusedEmotion]);

    const handleLeafClickInternal = React.useCallback((emotion: EmotionData) => {
        if (activeTab !== 'home') return;
        setFocusedEmotion(emotion);
        setCinematic(true);
    }, [activeTab, setFocusedEmotion, setCinematic]);

    const handleExitCinematic = React.useCallback(() => {
        setCinematic(false);
        setFocusedEmotion(null);
    }, [setCinematic, setFocusedEmotion]);

    return (
        <div
            className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#22190c] flex items-center justify-center p-0 md:p-6"
            style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
        >
            {/* Dynamic Window Container */}
            <div className="relative w-full h-full rounded-none md:rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] border-0 md:border-[1px] border-white/10 bg-gradient-to-b from-[#2a2218] to-[#1a150e]">

                {/* 3D Content Wrapper */}
                <div className={`absolute inset-0 z-0 transition-all duration-1000 ${isCinematic ? 'blur-sm brightness-50' : ''} ${activeTab === 'explore' ? 'opacity-80' : 'opacity-100'}`}>
                    <ErrorBoundary fallback={<ListView emotions={emotions} onLeafClick={handleLeafClickInternal} />}>
                        <Canvas
                            shadows={quality !== 'Low' && !deviceInfo.isMobile}
                            dpr={quality === 'Low' || deviceInfo.isMobile ? 1 : [1, Math.min(deviceInfo.pixelRatio, 2)]}
                            gl={{
                                antialias: quality === 'High' && !deviceInfo.isMobile,
                                toneMapping: 3,
                                powerPreference: deviceInfo.isLowEnd ? 'low-power' : 'high-performance',
                                stencil: false, // Disable stencil buffer on mobile
                                depth: true,
                                alpha: false, // Opaque background for better performance
                            }}
                            performance={{ min: 0.5 }} // Lower target FPS on mobile
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                        >
                            <PerspectiveCamera makeDefault position={[0, 20, 70]} fov={45} />

                            <AdaptiveDpr />

                            {/* <Background360 showSphereFallback={quality === 'Low'} /> */}
                            {/* <Environment preset="forest" /> */}

                            {/* Magical Lighting */}
                            <directionalLight
                                position={[20, 50, 20]}
                                intensity={1.5}
                                castShadow={quality !== 'Low' && !deviceInfo.isMobile}
                                shadow-mapSize={deviceInfo.isMobile ? [512, 512] : [1024, 1024]}
                                shadow-bias={-0.0001}
                                shadow-radius={deviceInfo.isMobile ? 2 : 4}
                                color="#e9ce98"
                            />
                            <hemisphereLight intensity={0.4} color="#cea86c" groundColor="#22190c" />
                            <fog attach="fog" args={['#22190c', 40, 150]} />

                            <Suspense fallback={<Html center><div className="text-white text-sm font-serif">Carregando Floresta...</div></Html>}>
                                <InstancedTree
                                    emotions={emotions}
                                    // onLeafClick={handleLeafClickInternal}
                                    onLeafHover={handleLeafHover}
                                    onEmotionsUpdate={setEmotions}
                                    reduceMotion={reduceMotion}
                                    seed={seed}
                                    isCinematic={isCinematic || activeTab !== 'home'}
                                    windLevel={windLevel}
                                    isPaused={isPaused}
                                />
                                <OrbitControls
                                    makeDefault
                                    enabled={!isCinematic && activeTab === 'home' && !focusedEmotion}
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

                                <HeroLeaf />

                                <CameraRig
                                    targetPosition={undefined}
                                />
                                {quality !== 'Low' && !deviceInfo.isLowEnd && (
                                    <Suspense fallback={null}>
                                        <LightParticles />
                                    </Suspense>
                                )}
                                {/* Disable Effects when cinematic to prevent WebGL context conflicts */}
                                {/* TEMPORARILY DISABLED FOR DEBUGGING */}
                                {/* {!isCinematic && <Effects quality={quality} isCinematic={isCinematic || activeTab !== 'home'} />} */}
                            </Suspense>
                        </Canvas>
                    </ErrorBoundary>
                    <Loader />
                </div>

                {/* Overlays */}
                <ErrorBoundary fallback={<div className="absolute inset-0 flex items-center justify-center text-white/50">Interface Indisponível</div>}>
                    {/* Back Button for Cinematic Mode */}
                    {isCinematic && (
                        <div className="absolute bottom-12 z-50 flex justify-center w-full pointer-events-none">
                            <button
                                onClick={handleExitCinematic}
                                className="
                                    pointer-events-auto
                                    group flex items-center justify-center gap-3 py-3 px-8
                                    bg-white/5 backdrop-blur-md border border-white/10 text-white
                                    font-serif tracking-widest font-medium text-xs uppercase rounded-full
                                    hover:bg-white/10 hover:border-white/30 hover:scale-105 transition-all duration-300 shadow-2xl
                                "
                            >
                                <ArrowLeft size={14} className="opacity-70 group-hover:-translate-x-1 transition-transform" />
                                Voltar para Floresta
                            </button>
                        </div>
                    )}
                    <LeafQuoteOverlay />
                    <MessageCard />

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
                </ErrorBoundary>
            </div>
        </div>
    );
};

// Initialize audio on first interaction
if (typeof window !== 'undefined') {
    const unlockAudio = () => {
        // Use a flag to prevent multiple calls
        const windowWithFlag = window as typeof window & { _audioUnlocked?: boolean };
        if (windowWithFlag._audioUnlocked) return;

        import('../../utils/SoundManager').then(({ soundManager }) => {
            try {
                soundManager.resume();
                windowWithFlag._audioUnlocked = true;
            } catch (e) {
                if (import.meta.env.DEV) {
                    console.warn("Audio unlock failed", e);
                }
            }
        });

        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
    };

    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    window.addEventListener('touchstart', unlockAudio);
}
