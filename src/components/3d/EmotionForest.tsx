import React, { Suspense, useState, lazy } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera, AdaptiveDpr, Loader } from '@react-three/drei';
import { motion } from "framer-motion";
import { InstancedTree } from './InstancedTree';
import { Effects } from './Effects';
import { HeroLeaf } from './HeroLeaf';
import { CameraRig } from './CameraRig';
import { Background360 } from '../scene/Background360';
import { UIOverlay } from '../ui/UIOverlay';
import { BottomNav } from '../ui/BottomNav';
import { LeafQuoteOverlay } from '../ui/LeafQuoteOverlay';
import { ErrorBoundary } from '../ui/ErrorBoundary';
import { CanvasErrorBoundary } from './CanvasErrorBoundary';
import { ListView } from '../ui/ListView';
import { TreeA11y } from '../ui/TreeA11y';
import type { EmotionData } from '../../types';
import { useStore } from '../../store/useStore';
import { SCENE_CONSTANTS } from '../../constants/3d';

// Lazy load heavy components
const LightParticles = lazy(() => import('./LightParticles').then(module => ({ default: module.LightParticles })));
import { useTreeGeneration } from '../../hooks/useTreeGeneration';
import { ContextMonitor } from './ContextMonitor';
import { CursorHighlight } from './CursorHighlight';
import * as THREE from 'three';

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

    // Context Handling
    const [contextLost, setContextLost] = useState(false);
    const [sceneKey, setSceneKey] = useState(0);

    // Shared Tree Generation (Lifted State)
    const treeData = useTreeGeneration(seed, emotions);

    const [hoverPosition, setHoverPosition] = useState<THREE.Vector3 | null>(null);

    const handleLeafHover = React.useCallback((emotion: EmotionData | null, x: number, y: number, position?: THREE.Vector3) => {
        if (isCinematic || activeTab !== 'home' || focusedEmotion) {
            setTooltip(null);
            setHoverPosition(null);
            return;
        }
        if (emotion) {
            setTooltip({ text: emotion.subcategory || emotion.category, x, y });
            if (position) setHoverPosition(position.clone()); // Clone to avoid mutation issues
        } else {
            setTooltip(null);
            setHoverPosition(null);
        }
    }, [isCinematic, activeTab, focusedEmotion]);

    const handleLeafClickInternal = React.useCallback((emotion: EmotionData) => {
        if (activeTab !== 'home') return;
        setFocusedEmotion(emotion);
        setCinematic(true);
    }, [activeTab, setFocusedEmotion, setCinematic]);



    const handleContextRestored = React.useCallback(() => {
        setSceneKey(prev => prev + 1);
    }, []);

    // Golden Master Logic: Force DPR 1 on mobile
    const pixelRatio = deviceInfo.isMobile ? 1 : Math.min(deviceInfo.pixelRatio, 2);
    // Effects enabled only if NOT mobile AND quality is NOT Low
    const enableEffects = !deviceInfo.isMobile && quality !== 'Low' && !isCinematic;

    return (
        <div
            className="fixed inset-0 w-screen h-screen overflow-hidden bg-[#22190c] flex items-center justify-center p-0 md:p-6"
            style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}
        >
            <div className="relative w-full h-full rounded-none md:rounded-[2.5rem] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.5)] border-0 md:border-[1px] border-white/10 bg-gradient-to-b from-[#2a2218] to-[#1a150e]">

                {/* Context Lost Overlay */}
                {contextLost && (
                    <div className="absolute inset-0 z-[100] flex flex-col items-center justify-center bg-black/90 text-white p-6 text-center backdrop-blur-xl">
                        <div className="w-16 h-16 mb-6 border-2 border-[#e9ce98] border-t-transparent rounded-full animate-spin" />
                        <h2 className="text-2xl font-serif mb-4 text-[#e9ce98]">Conexão Gráfica Interrompida</h2>
                        <p className="text-sm opacity-70 mb-8 max-w-md">O navegador suspendeu o processamento 3D para economizar recursos. Estamos prontos para restaurar a sua floresta.</p>
                        <div className="flex flex-col sm:flex-row gap-4">
                            <button
                                onClick={() => {
                                    setSceneKey(prev => prev + 1);
                                    setContextLost(false);
                                }}
                                className="px-8 py-3 bg-[#e9ce98] text-[#22190c] font-bold rounded-full hover:scale-105 transition-all shadow-xl"
                            >
                                Restaurar Agora
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="px-8 py-3 bg-white/10 text-white font-medium rounded-full hover:bg-white/20 transition-all"
                            >
                                Recarregar Página
                            </button>
                        </div>
                    </div>
                )}

                <div className={`absolute inset-0 z-0 transition-all duration-1000 ${activeTab === 'explore' ? 'opacity-80' : 'opacity-100'}`}>
                    {/* Cinematic Overlay handled by fading UI elements, HeroLeaf stays bright */}
                    <ErrorBoundary fallback={<ListView emotions={emotions} onLeafClick={handleLeafClickInternal} />}>
                        <Canvas
                            key={sceneKey}
                            shadows={quality !== 'Low' && !deviceInfo.isMobile}
                            dpr={pixelRatio}
                            gl={{
                                antialias: quality === 'High' && !deviceInfo.isMobile,
                                toneMapping: 3, // ACESFilmic
                                powerPreference: 'high-performance',
                                depth: true,
                                alpha: false,
                                preserveDrawingBuffer: false, // Better context restoration support
                            }}
                            performance={{ min: 0.5 }}
                            style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                        >
                            <ContextMonitor setContextLost={setContextLost} onContextRestored={handleContextRestored} />

                            <PerspectiveCamera makeDefault position={[0, 20, 70]} fov={45} />

                            {!deviceInfo.isMobile && <AdaptiveDpr pixelated />}

                            {/* Lighting - Critical for Visuals */}
                            <directionalLight
                                position={SCENE_CONSTANTS.LIGHTS.DIRECTIONAL.POSITION}
                                intensity={SCENE_CONSTANTS.LIGHTS.DIRECTIONAL.INTENSITY}
                                castShadow={quality !== 'Low' && !deviceInfo.isMobile}
                                shadow-mapSize={[
                                    deviceInfo.isMobile ? SCENE_CONSTANTS.LIGHTS.DIRECTIONAL.SHADOW_MAP_SIZE_MOBILE : SCENE_CONSTANTS.LIGHTS.DIRECTIONAL.SHADOW_MAP_SIZE_DESKTOP,
                                    deviceInfo.isMobile ? SCENE_CONSTANTS.LIGHTS.DIRECTIONAL.SHADOW_MAP_SIZE_MOBILE : SCENE_CONSTANTS.LIGHTS.DIRECTIONAL.SHADOW_MAP_SIZE_DESKTOP
                                ]}
                                shadow-bias={-0.0001}
                                color={SCENE_CONSTANTS.LIGHTS.DIRECTIONAL.COLOR}
                            />
                            <hemisphereLight
                                intensity={SCENE_CONSTANTS.LIGHTS.HEMISPHERE.INTENSITY}
                                color={SCENE_CONSTANTS.LIGHTS.HEMISPHERE.SKY_COLOR}
                                groundColor={SCENE_CONSTANTS.LIGHTS.HEMISPHERE.GROUND_COLOR}
                            />
                            <fog attach="fog" args={[SCENE_CONSTANTS.FOG.COLOR, SCENE_CONSTANTS.FOG.NEAR, SCENE_CONSTANTS.FOG.FAR]} />

                            <CanvasErrorBoundary>
                                <Suspense fallback={null}> {/* Main Scene Suspense */}

                                    <Background360 showSphereFallback={quality === 'Low'} />
                                    <Environment preset="forest" />
                                    {/* Note: Background360 is now safe/no-suspense, Environment might suspend but is now inside this boundary */}

                                    <InstancedTree
                                        treeData={treeData}
                                        emotions={emotions}
                                        onLeafHover={handleLeafHover}
                                        onLeafClick={handleLeafClickInternal}
                                        onEmotionsUpdate={setEmotions}
                                        reduceMotion={reduceMotion}
                                        seed={seed}
                                        isCinematic={isCinematic || activeTab !== 'home'}
                                        windLevel={windLevel}
                                        isPaused={isPaused}
                                    />

                                    <CursorHighlight
                                        position={hoverPosition || new THREE.Vector3()}
                                        active={!!hoverPosition}
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

                                    <CameraRig targetPosition={undefined} />

                                    {quality !== 'Low' && !deviceInfo.isMobile && (
                                        <LightParticles />
                                    )}

                                    {/* Effects Component - Only render if enabled (not mobile, not low quality, not cinematic) */}
                                    {enableEffects && <Effects quality={quality} isCinematic={isCinematic || activeTab !== 'home'} />}
                                </Suspense>
                            </CanvasErrorBoundary>
                        </Canvas>
                    </ErrorBoundary>

                    {/* HTML Loader Overlay - Visible while Suspense suspends */}
                    <Suspense fallback={
                        <div className="absolute inset-0 flex items-center justify-center bg-[#22190c] z-50 transition-opacity duration-500">
                            <div className="text-[#e9ce98] font-serif tracking-widest animate-pulse">CARREGANDO FLORESTA...</div>
                        </div>
                    }>
                        {/* Empty suspense just to trigger fallback if any child suspends? 
                            Actually, the Canvas children suspend INSIDE the canvas. 
                            To show an HTML loader over the canvas, we can use <Loader /> from drei which connects to useProgress 
                        */}
                    </Suspense>
                    <Loader
                        dataInterpolation={(p) => `Carregando ${p.toFixed(0)}%`}
                        initialState={(active) => active}
                        containerStyles={{
                            background: '#22190c',
                        }}
                        innerStyles={{
                            backgroundColor: '#e9ce98',
                            width: '200px',
                            height: '2px',
                        }}
                        barStyles={{
                            backgroundColor: '#e9ce98',
                            height: '2px',
                        }}
                        dataStyles={{
                            color: '#e9ce98',
                            fontFamily: 'serif',
                            textTransform: 'uppercase',
                            letterSpacing: '0.2em',
                            fontSize: '0.8rem',
                        }}
                    />
                </div>

                <ErrorBoundary fallback={<div className="absolute inset-0 flex items-center justify-center text-white/50">Interface Indisponível</div>}>
                    {/* Cinematic Back Button Removed - Leaf click handles it */}

                    <LeafQuoteOverlay />
                    {/* MessageCard Removed - Text is on HeroLeaf */}
                    {/* <MessageCard /> */}

                    {!isCinematic && <BottomNav />}
                    {!isCinematic && activeTab === 'home' && <UIOverlay />}
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

                    {/* Accessibility Layer - Rendered outside Canvas but connected to it */}
                    {!isCinematic && activeTab === 'home' && (
                        <TreeA11y
                            treeData={treeData}
                            emotions={emotions}
                            onLeafClick={handleLeafClickInternal}
                        />
                    )}
                </ErrorBoundary>
            </div>
        </div>
    );
};
