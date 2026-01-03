import React from 'react';
import { Canvas } from '@react-three/fiber';
import { Environment, OrbitControls, ContactShadows } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, DepthOfField } from '@react-three/postprocessing';
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
        <div className="fixed inset-0 z-50 animate-fade-in">
            {/* Bokeh Background (CSS) */}
            <div
                className="absolute inset-0 scale-110 blur-xl transition-all duration-1000 ease-out"
                style={{
                    backgroundImage: "url(/bokeh.jpg)",
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    opacity: 0.9
                }}
            />

            {/* Dark Vignette Overlay */}
            <div className="absolute inset-0 bg-black/20 radial-gradient(circle, transparent 40%, black 100%) pointer-events-none" />

            {/* 3D Scene */}
            <Canvas
                shadows
                dpr={[1, 2]}
                gl={{ antialias: true, alpha: true, toneMapping: 3 }} // ACESFilmic
                camera={{ fov: 35, position: [0, 0.1, 2.8], near: 0.1, far: 20 }}
                style={{ position: "absolute", inset: 0 }}
            >
                {/* Cinematic Lighting */}
                <ambientLight intensity={0.4} />
                <directionalLight position={[3, 4, 2]} intensity={1.5} castShadow />
                <directionalLight position={[-3, 2, -2]} intensity={0.5} color="#e6f0ff" /> {/* Cool rim fill */}
                <spotLight position={[0, 3, 2]} angle={0.4} penumbra={0.5} intensity={1.0} castShadow />

                <Environment preset="sunset" blur={1} />
                <React.Suspense fallback={null}>
                    <HeroLeaf
                        emotion={focusedEmotion}
                        tint={focusedEmotion.color}
                    />
                </React.Suspense>

                <ContactShadows position={[0, -1.2, 0]} opacity={0.4} blur={2.5} scale={8} far={4} color="#1a1005" />

                <OrbitControls
                    enablePan={false}
                    enableZoom={false}
                    enableRotate={true}
                    minPolarAngle={Math.PI / 2 - 0.2}
                    maxPolarAngle={Math.PI / 2 + 0.2}
                    minAzimuthAngle={-0.2}
                    maxAzimuthAngle={0.2}
                    rotateSpeed={0.2}
                />

                <EffectComposer>
                    <Bloom intensity={0.5} luminanceThreshold={0.8} luminanceSmoothing={0.3} mipmapBlur />
                    <Vignette eskil={false} offset={0.3} darkness={0.4} />
                    <DepthOfField target={[0, 0, 0]} focalLength={0.05} bokehScale={2} height={480} />
                </EffectComposer>
            </Canvas>

            {/* Glass UI Overlay */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex gap-4 pointer-events-auto">
                <button
                    onClick={handleBack}
                    className="
                        group flex items-center justify-center gap-3 py-3 px-8
                        bg-white/10 backdrop-blur-xl border border-white/20 text-white
                        font-serif tracking-widest font-medium text-xs uppercase rounded-full
                        hover:bg-white/20 hover:border-white/40 hover:scale-105 
                        transition-all duration-300 shadow-xl shadow-black/10
                    "
                >
                    <ArrowLeft size={14} className="opacity-80 group-hover:-translate-x-1 transition-transform" />
                    Voltar para Floresta
                </button>
            </div>
        </div>
    );
};
