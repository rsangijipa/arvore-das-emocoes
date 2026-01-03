import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { HeroLeaf } from './HeroLeaf';
import { useStore } from '../../store/useStore';
import { ArrowLeft } from 'lucide-react';

export const LeafCinematicModal: React.FC = () => {
    const { focusedEmotion, setCinematic, setFocusedEmotion } = useStore();

    if (!focusedEmotion) return null;

    const handleBack = () => {
        setCinematic(false);
        setFocusedEmotion(null);
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in">
            {/* Backdrop with Blur */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-3xl transition-opacity duration-1000"
                onClick={handleBack}
                aria-hidden="true"
            />

            {/* Dark Vignette Overlay */}
            <div className="absolute inset-0 pointer-events-none bg-radial-gradient from-transparent to-black/80 opacity-80" />

            {/* 3D Scene */}
            <div className="absolute inset-0 z-10">
                <Canvas
                    shadows
                    dpr={[1, 2]}
                    gl={{ antialias: true, alpha: true, toneMapping: 3 }} // ACESFilmic
                    camera={{ fov: 45, position: [0, 0, 4.5], near: 0.1, far: 20 }}
                    style={{ position: "absolute", inset: 0 }}
                >
                    {/* Cinematic Lighting */}
                    <ambientLight intensity={0.8} />
                    <spotLight position={[5, 10, 5]} angle={0.5} penumbra={1} intensity={2} castShadow />
                    <pointLight position={[-3, -3, 2]} intensity={0.5} color="#cce0ff" />

                    <Environment preset="city" blur={1} />

                    <React.Suspense fallback={null}>
                        <HeroLeaf
                            emotion={focusedEmotion}
                            tint={focusedEmotion.color}
                        />
                    </React.Suspense>

                    <OrbitControls
                        enablePan={false}
                        enableZoom={false}
                        minPolarAngle={Math.PI / 2 - 0.4}
                        maxPolarAngle={Math.PI / 2 + 0.4}
                        minAzimuthAngle={-0.4}
                        maxAzimuthAngle={0.4}
                        rotateSpeed={0.3}
                        dampingFactor={0.1}
                    />

                    <EffectComposer>
                        <Bloom intensity={0.3} luminanceThreshold={0.85} luminanceSmoothing={0.1} />
                        <Vignette eskil={false} offset={0.2} darkness={0.4} />
                    </EffectComposer>
                </Canvas>
            </div>

            {/* Glass UI Overlay - Back Button */}
            <div className="absolute bottom-12 z-50 flex justify-center w-full pointer-events-none">
                <button
                    onClick={handleBack}
                    className="
                        pointer-events-auto
                        group flex items-center justify-center gap-3 py-3 px-8
                        bg-white/5 backdrop-blur-md border border-white/10 text-white/90
                        font-serif tracking-widest font-medium text-xs uppercase rounded-full
                        hover:bg-white/10 hover:border-white/30 hover:scale-105 hover:text-white
                        transition-all duration-300 shadow-2xl
                    "
                >
                    <ArrowLeft size={14} className="opacity-70 group-hover:-translate-x-1 transition-transform" />
                    Voltar para Floresta
                </button>
            </div>
        </div>
    );
};
