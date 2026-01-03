import React, { useEffect, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Environment, OrbitControls, ContactShadows } from '@react-three/drei';
import { MessageLeaf } from '../3d/MessageLeaf';
import type { EmotionData } from '../../types';

interface LeafViewerModalProps {
    emotion: EmotionData | null;
    onClose: () => void;
}

export const LeafViewerModal: React.FC<LeafViewerModalProps> = ({ emotion, onClose }) => {
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    return (
        <AnimatePresence>
            {emotion && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-0">
                    {/* Backdrop - Soft Blur */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-boho-dark/40 backdrop-blur-sm cursor-pointer"
                    />

                    {/* Modal Content - Boho Card */}
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: 20 }}
                        transition={{ type: "spring", stiffness: 200, damping: 25 }}
                        className="
                            relative w-[90vw] max-w-4xl h-[80vh] 
                            bg-boho-bg/95 backdrop-blur-md rounded-3xl overflow-hidden shadow-2xl
                            border border-white/40
                            flex flex-col items-center justify-center
                        "
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-6 right-6 z-50 p-2 text-boho-text hover:text-white hover:bg-boho-terracotta rounded-full transition-all duration-300 pointer-events-auto"
                        >
                            <X size={28} />
                        </button>

                        <div className="w-full h-full flex flex-col md:flex-row relative">
                            {/* 3D Visualizer Side */}
                            <div className="w-full md:w-1/2 h-1/2 md:h-full relative bg-boho-clay/5">
                                <Canvas
                                    className="pointer-events-auto cursor-move"
                                    camera={{ position: [0, 0, 7], fov: 35 }}
                                    dpr={[1, 2]}
                                >
                                    <ambientLight intensity={0.8} />
                                    <directionalLight position={[5, 2, 5]} intensity={1.8} castShadow color="#fffaf0" />
                                    <directionalLight position={[-5, 0, 2]} intensity={1.2} color="#ffd700" />

                                    <Suspense fallback={null}>
                                        <Environment preset="studio" blur={0.8} />
                                        <MessageLeaf emotion={emotion} />
                                        <ContactShadows position={[0, -2.5, 0]} opacity={0.4} scale={10} blur={2.5} far={4} color="#3E3228" />
                                        <OrbitControls enableZoom={true} enablePan={false} minPolarAngle={Math.PI / 3} maxPolarAngle={Math.PI / 1.5} />
                                    </Suspense>
                                </Canvas>

                                <div className="absolute bottom-6 w-full text-center text-boho-sage text-[10px] font-bold tracking-[0.25em] uppercase pointer-events-none opacity-60">
                                    Toque para Girar
                                </div>
                            </div>

                            {/* Content Side */}
                            <div className="w-full md:w-1/2 h-1/2 md:h-full p-8 md:p-12 overflow-y-auto">
                                <div className="mb-8">
                                    <span className="inline-block px-3 py-1 bg-boho-sage/10 text-boho-sage text-[10px] font-bold rounded-full uppercase tracking-widest mb-4">
                                        {emotion.category} • {emotion.subcategory}
                                    </span>
                                    <h2 className="text-4xl font-serif text-boho-dark mb-2">{emotion.text}</h2>
                                    <div className="flex gap-1 mb-6">
                                        {[1, 2, 3, 4, 5].map((i) => (
                                            <div
                                                key={i}
                                                className={`h-1.5 w-8 rounded-full ${i <= emotion.intensity ? 'bg-boho-terracotta' : 'bg-boho-sage/20'}`}
                                            />
                                        ))}
                                    </div>
                                </div>

                                <div className="space-y-8">
                                    <section>
                                        <h4 className="text-[10px] font-bold text-boho-clay uppercase tracking-[0.2em] mb-4 opacity-50">Reflexão Guiada</h4>
                                        <div className="space-y-6">
                                            {[
                                                { q: "O que aconteceu?", a: emotion.reflection },
                                                { q: "O que eu senti no corpo?", a: "Senti uma leve pressão no peito..." },
                                                { q: "O que eu precisava?", a: "Precisava de calma e compreensão." },
                                                { q: "O que eu escolho fazer agora?", a: "Vou respirar fundo e aceitar o momento." }
                                            ].map((item, idx) => (
                                                <div key={idx} className="border-l-2 border-boho-sage/20 pl-4 py-1">
                                                    <p className="text-boho-clay/60 text-[11px] italic mb-1">{item.q}</p>
                                                    <p className="text-boho-text text-sm leading-relaxed">{item.a}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                    <div className="pt-4 flex flex-wrap gap-2">
                                        {emotion.tags.map(tag => (
                                            <span key={tag} className="text-[10px] text-boho-clay/60 bg-white border border-boho-clay/10 px-2 py-0.5 rounded-lg">
                                                #{tag}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
