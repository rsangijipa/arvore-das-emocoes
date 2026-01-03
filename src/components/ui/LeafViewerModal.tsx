import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
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
                <div className="fixed inset-0 z-50 flex items-center justify-center p-0 overflow-hidden">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-boho-dark/60 backdrop-blur-md cursor-pointer"
                    />

                    {/* Jumping Leaf Container */}
                    <motion.div
                        initial={{ scale: 0.1, rotate: 45, opacity: 0 }}
                        animate={{ scale: 1, rotate: 0, opacity: 1 }}
                        exit={{ scale: 0.1, rotate: -45, opacity: 0 }}
                        transition={{ type: "spring", stiffness: 120, damping: 15 }}
                        className="relative z-10 w-[90vw] md:w-[60vw] max-w-2xl aspect-[4/5] flex items-center justify-center pointer-events-none" // pointer-events-none to let click through if needed, but we have content
                    >
                        {/* Leaf Image Background */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <img
                                src={emotion.textureUrl || '/leaf_texture_1.png'}
                                alt="Leaf"
                                className="w-full h-full object-contain filter drop-shadow-2xl brightness-110 contrast-105"
                                style={{ transform: 'scale(1.3)' }}
                            />
                        </div>

                        {/* Content Overlay */}
                        <div className="relative z-20 w-[80%] h-[80%] flex flex-col items-center justify-center text-center p-8 pointer-events-auto">

                            {/* Title / Category */}
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.2 }}
                                className="mb-4"
                            >
                                <span className="inline-block px-3 py-1 bg-white/80 backdrop-blur-sm text-boho-dark text-[10px] font-bold rounded-full uppercase tracking-widest shadow-sm">
                                    {emotion.category}
                                </span>
                            </motion.div>

                            {/* Message - Modern Variable Font */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.3 }}
                                className="flex-1 flex items-center justify-center"
                            >
                                <h2 className="text-3xl md:text-4xl lg:text-5xl font-sans font-bold text-boho-dark leading-tight tracking-tight drop-shadow-sm mix-blend-multiply">
                                    "{emotion.reflection}"
                                </h2>
                            </motion.div>

                            {/* Footer / Subcategory */}
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.7 }}
                                transition={{ delay: 0.5 }}
                                className="mt-6"
                            >
                                <p className="text-boho-clay text-sm font-medium italic">
                                    — {emotion.text}
                                </p>
                            </motion.div>

                            {/* Close Button Floating */}
                            <button
                                onClick={onClose}
                                className="absolute -top-10 right-0 md:-right-10 bg-white/20 hover:bg-white/40 backdrop-blur-md rounded-full p-2 text-white transition-all pointer-events-auto"
                            >
                                <X size={24} />
                            </button>
                        </div>

                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};
