import React, { Suspense, useState, lazy } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera, AdaptiveDpr, Loader, Html } from '@react-three/drei';
import { motion } from "framer-motion";
import { InstancedTree } from './InstancedTree';
import { Effects } from './Effects';
import { HeroLeaf } from './HeroLeaf';
import { SunLight } from './SunLight';
import { CameraRig } from './CameraRig';
import { Background360 } from '../scene/Background360';
import { UIOverlay } from '../ui/UIOverlay';
import { BottomNav } from '../ui/BottomNav';
import { LeafQuoteOverlay } from '../ui/LeafQuoteOverlay';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { ListView } from '../ui/ListView';
import { ArrowLeft, Bird } from 'lucide-react';
import type { EmotionData } from '../../types';
import { useStore } from '../../store/useStore';
import { StudioMain } from '../ui/StudioMain';
import { BreathingExercise } from '../ui/BreathingExercise';


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
                            dpr={quality === 'Low' || deviceInfo.isMobile ? 1 : [1, 1.5]} // Cap DPR at 1.5 for performance stability
                            gl={{
                                antialias: quality === 'High' && !deviceInfo.isMobile,
                                toneMapping: 3,
                                powerPreference: 'default', // Changed from high-performance to default for stability
                                stencil: false,
                                depth: true,
                                alpha: false,
                            }}
                            performance={{ min: 0.5 }}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                        >
                            <PerspectiveCamera makeDefault position={[0, 20, 70]} fov={45} />

                            <AdaptiveDpr />

                            {quality !== 'Low' ? (
                                <Environment preset="forest" />
                            ) : (
                                <ambientLight intensity={0.5} />
                            )}

                            {/* Magical Lighting */}
                            <SunLight />
                            <hemisphereLight intensity={0.4} color="#cea86c" groundColor="#22190c" />
                            <fog attach="fog" args={['#22190c', 40, 150]} />

                            <Suspense fallback={<Html center><div className="text-white text-sm font-serif">Carregando Floresta...</div></Html>}>
                                <Background360 showSphereFallback={quality === 'Low'} />
                                <InstancedTree
                                    emotions={emotions}
                                    onLeafHover={handleLeafHover}
                                    onEmotionsUpdate={setEmotions}
                                    reduceMotion={reduceMotion}
                                    seed={seed}
                                    isCinematic={isCinematic || activeTab !== 'home'}
                                    windLevel={windLevel}
                                    isPaused={isPaused}
                                    onLeafClick={handleLeafClickInternal}
                                />
                                <OrbitControls
                                    makeDefault
                                    enabled={!isCinematic && activeTab === 'home' && !focusedEmotion}
                                    minPolarAngle={Math.PI / 2.2} // Restrict vertical rotation (almost horizontal only)
                                    maxPolarAngle={Math.PI / 2 - 0.05} // Don't allow going below ground
                                    minDistance={30}  // Zoom in limit
                                    maxDistance={80}  // Zoom out limit (restricted to keep tree large)
                                    target={[0, 15, 0]} // Target slightly higher up the tree
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
                                {!reduceMotion && (
                                    <Suspense fallback={null}>
                                        <LightParticles />
                                    </Suspense>
                                )}
                                {/* Disable Effects when cinematic to prevent WebGL context conflicts */}
                                {!isCinematic && quality !== 'Low' && <Effects quality={quality} isCinematic={isCinematic || activeTab !== 'home'} />}
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
                    {/* MessageCard removed - now displayed on HeroLeaf */}

                    {/* Main Navigation - Elegant Light Mode */}
                    {!isCinematic && <BottomNav />}

                    {/* Control Panel - Elegant Light Mode */}
                    {!isCinematic && activeTab === 'home' && <UIOverlay />}

                    {/* Feature Tabs */}
                    {activeTab === 'studio' && <StudioMain />}
                    {activeTab === 'breathing' && <BreathingExercise />}

                    {activeTab === 'gallery' && (
                        <div className="absolute inset-0 z-50 bg-[#f9f7f2]/95 backdrop-blur-xl p-8 overflow-y-auto pt-24">
                            <div className="max-w-4xl mx-auto">
                                <h2 className="text-3xl font-serif text-gray-800 mb-2">Sua Galeria Emocional</h2>
                                <p className="text-sm text-gray-400 uppercase tracking-widest mb-8">Recordações da sua jornada interior</p>
                                <ListView emotions={emotions} onLeafClick={handleLeafClickInternal} />
                            </div>
                        </div>
                    )}

                    {activeTab === 'explore' && (
                        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm pointer-events-none">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center p-12 bg-white/10 backdrop-blur-3xl rounded-[3rem] border border-white/20 shadow-2xl"
                            >
                                <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                                    <Bird className="text-emerald-400" size={32} />
                                </div>
                                <h2 className="text-4xl font-serif text-white mb-4 italic">A Natureza Sussurra...</h2>
                                <p className="text-white/60 font-sans tracking-[0.4em] uppercase text-xs">Segredos Antigos em Breve</p>
                            </motion.div>
                        </div>
                    )}

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
