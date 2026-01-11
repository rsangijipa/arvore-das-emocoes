import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useStore } from '../../store/useStore';
import { X } from 'lucide-react';

export const MessageOverlay: React.FC = () => {
    const selectedMessage = useStore(state => state.selectedMessage);
    const setFocusedLeaf = useStore(state => state.setFocusedLeaf);
    const setSelectedMessage = useStore(state => state.setSelectedMessage);
    const setInteractionLock = useStore(state => state.setInteractionLock);
    const setCinematic = useStore(state => state.setCinematic);
    const setFocusedEmotion = useStore(state => state.setFocusedEmotion);

    const handleClose = () => {
        setFocusedLeaf(null);
        setSelectedMessage(null);
        setFocusedEmotion(null);
        setCinematic(false);
        setTimeout(() => setInteractionLock(false), 500);
    };

    if (!selectedMessage) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[200] flex items-center justify-center p-6 pointer-events-none"
            >
                {/* Backdrop with slight blur just behind the card, but canvas visible */}
                {/* Note: We don't want a full dark backdrop blocking the 3D scene completely, or do we? 
                   Let's keep it minimal so we see the 3D leaf "holding" the message visually if aligned.
                   For now, a centered glassmorphism card.
               */}

                <motion.div
                    initial={{ scale: 0.9, y: 20, opacity: 0 }}
                    animate={{ scale: 1, y: 0, opacity: 1 }}
                    exit={{ scale: 0.9, y: 20, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="pointer-events-auto relative w-full max-w-lg bg-white/90 backdrop-blur-xl rounded-[2rem] shadow-2xl p-8 border border-white/40 text-center"
                >
                    <button
                        onClick={handleClose}
                        className="absolute top-4 right-4 p-2 bg-black/5 hover:bg-black/10 rounded-full transition-colors"
                    >
                        <X className="w-5 h-5 text-gray-800" />
                    </button>

                    <div className="mb-6">
                        <span className="inline-block px-3 py-1 bg-[#e9ce98] text-[#22190c] text-[10px] font-black uppercase tracking-widest rounded-full mb-4">
                            Mensagem
                        </span>
                        <h2 className="font-serif text-3xl md:text-4xl text-[#22190c] leading-tight mb-4">
                            "{selectedMessage.text}"
                        </h2>
                        {selectedMessage.author && (
                            <p className="font-sans text-sm text-[#22190c]/60 font-medium tracking-wide">
                                — {selectedMessage.author}
                            </p>
                        )}
                    </div>

                    <div className="flex gap-4 justify-center mt-8">
                        <button
                            onClick={handleClose}
                            className="px-8 py-3 bg-[#22190c] text-[#e9ce98] text-xs font-bold uppercase tracking-widest rounded-full hover:scale-105 transition-transform shadow-lg"
                        >
                            Devolver à Floresta
                        </button>
                    </div>

                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};
