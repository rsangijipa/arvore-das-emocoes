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

                        <div className="w-full h-full relative">
                            <Canvas
                                className="pointer-events-auto cursor-move"
                                camera={{ position: [0, 0, 8], fov: 35 }} // Narrow FOV for portrait feel
                                dpr={[1, 2]}
                            >
                                <ambientLight intensity={0.8} />
                                <directionalLight position={[5, 2, 5]} intensity={1.8} castShadow color="#fffaf0" />
                                <directionalLight position={[-5, 0, 2]} intensity={1.2} color="#ffd700" />

                                <Suspense fallback={null}>
                                    {/* Studio Logic for Best GLB Display */}
                                    <Environment preset="studio" blur={0.8} />

                                    <MessageLeaf emotion={emotion} />

                                    <ContactShadows position={[0, -2.5, 0]} opacity={0.4} scale={10} blur={2.5} far={4} color="#3E3228" />
                                    <OrbitControls
                                        enableZoom={true}
                                        enablePan={false}
                                        minPolarAngle={Math.PI / 3}
                                        maxPolarAngle={Math.PI / 1.5}
                                    />
                                </Suspense>
                            </Canvas>

                            <div className="absolute bottom-6 w-full text-center text-boho-sage text-xs font-bold tracking-[0.25em] uppercase pointer-events-none opacity-80">
                                Toque para Girar
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
