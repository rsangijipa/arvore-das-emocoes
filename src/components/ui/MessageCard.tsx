import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowLeft } from 'lucide-react';
import { useStore } from '../../store/useStore';
// import { RAW_MESSAGES } from '../../data/messages';

export const MessageCard: React.FC = () => {
    const {
        focusedLeaf,
        setFocusedLeaf,
        selectedMessage,
        setSelectedMessage,
        setInteractionLock
    } = useStore();

    // Use selectedMessage from store, fallback for safety
    const message = selectedMessage || { text: "...", author: "" };

    const handleClose = () => {
        setFocusedLeaf(null);
        setSelectedMessage(null);
        // Ensure lock is released (should be already, but safety first)
        setInteractionLock(false);
    };

    return (
        <AnimatePresence>
            {focusedLeaf && (
                <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 50 }}
                    transition={{ type: "spring", damping: 25, stiffness: 300 }}
                    className="fixed z-50 pointer-events-none flex items-center justify-end"
                    style={{
                        top: 0,
                        right: 0,
                        bottom: 0,
                        width: '100%',
                        padding: '2rem'
                    }}
                >
                    {/* Glass Card */}
                    <div className="
                        pointer-events-auto
                        w-full max-w-md md:w-[40vw]
                        bg-white/10 backdrop-blur-xl
                        border border-white/20
                        shadow-2xl rounded-3xl
                        p-8 md:p-12
                        flex flex-col gap-6
                        text-white
                    ">
                        {/* Header */}
                        <div className="flex justify-between items-start">
                            <div className="w-12 h-1 bg-white/30 rounded-full" />
                            <button
                                onClick={handleClose}
                                className="p-2 rounded-full hover:bg-white/10 transition-colors"
                                aria-label="Fechar"
                            >
                                <X size={24} className="opacity-70" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="space-y-4">
                            <h2 className="text-2xl md:text-3xl font-serif leading-tight">
                                "{message.text}"
                            </h2>
                            {message.author && (
                                <p className="text-sm font-medium tracking-widest opacity-60 uppercase">
                                    — {message.author}
                                </p>
                            )}
                        </div>

                        {/* Footer / Action */}
                        <div className="mt-auto pt-8">
                            <button
                                onClick={handleClose}
                                className="
                                    flex items-center gap-3 px-6 py-3
                                    bg-white/90 text-gray-900 rounded-full
                                    font-medium hover:bg-white transition-colors
                                    hover:scale-105 active:scale-95 duration-200
                                "
                            >
                                <ArrowLeft size={16} />
                                <span>Voltar para Floresta</span>
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
