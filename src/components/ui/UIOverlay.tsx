import React, { useState, useEffect } from 'react';
import {
    RefreshCcw,
    Wind,
    Pause,
    Play,
    Maximize2,
    Minus,
    Zap,
    Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import { useStore } from '../../store/useStore';
import { soundManager } from '../../utils/SoundManager';
import { cn } from '../../utils/cn';

export const UIOverlay: React.FC = () => {
    const {
        regenerateSeed,
        windLevel,
        setWindLevel,
        isPaused,
        togglePause: storeTogglePause,
        isCinematic,
        setCinematic,
        setReduceMotion,
        reduceMotion,
        setQuality // Added setQuality
    } = useStore();

    const [isVisible, setIsVisible] = useState(false);
    const [isMinimized, setIsMinimized] = useState(false);

    // Sync Performance Toggle
    const handleTogglePerformance = () => {
        const newMode = !reduceMotion;
        setReduceMotion(newMode);
        setQuality(newMode ? 'Low' : 'High'); // Sync Quality
    };

    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 1500);
        return () => clearTimeout(timer);
    }, []);

    const handleRegenerate = () => {
        soundManager.playRegenerate();
        regenerateSeed();
        confetti({
            particleCount: 80,
            spread: 60,
            origin: { x: 0.1, y: 0.9 }, // From the panel area
            colors: ['#2d5a27', '#cea86c', '#615225', '#f9ce98']
        });
    };

    const togglePause = () => {
        soundManager.playClick();
        storeTogglePause();
    };

    const nextWindLevel = () => {
        soundManager.playClick();
        const levels: ('Off' | 'Calm' | 'Breezy')[] = ['Off', 'Calm', 'Breezy'];
        const currentIdx = levels.indexOf(windLevel);
        setWindLevel(levels[(currentIdx + 1) % levels.length]);
    };

    if (isCinematic) {
        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="fixed bottom-12 left-1/2 -translate-x-1/2 z-50 flex gap-4"
            >
                <button
                    onClick={handleRegenerate}
                    className="bg-white/90 backdrop-blur-xl border border-black/10 flex items-center gap-3 py-3 px-8 text-black rounded-full font-serif tracking-widest text-xs uppercase hover:bg-white transition-all shadow-xl active:scale-95"
                >
                    <RefreshCcw size={14} className="opacity-70" />
                    Renovar Árvore
                </button>

                <button
                    onClick={() => setCinematic(false)}
                    className="bg-black/90 hover:bg-black text-white flex items-center gap-3 py-3 px-8 rounded-full font-serif tracking-widest text-xs uppercase transition-all shadow-xl active:scale-95"
                >
                    Voltar
                </button>
            </motion.div>
        );
    }

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.8, x: -40, y: 40 }}
                    animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                    className="fixed bottom-8 left-8 z-50 pointer-events-none"
                    style={{ minWidth: '240px' }}
                >
                    <div className={cn(
                        "pointer-events-auto flex flex-col gap-3 transition-all duration-500",
                        isMinimized ? "w-14" : "w-64"
                    )}>
                        {/* Elegant Header */}
                        <div className="bg-white/95 backdrop-blur-3xl border border-white shadow-2xl rounded-2xl p-3 flex items-center justify-between overflow-hidden">
                            <div className={cn("flex items-center gap-2.5", isMinimized && "hidden")}>
                                <div className="p-1.5 bg-emerald-100 rounded-lg">
                                    <Sparkles size={16} className="text-emerald-700" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black text-gray-900 uppercase tracking-[0.15em] leading-none">Painel</span>
                                    <span className="text-[9px] font-medium text-gray-400 uppercase tracking-widest mt-1">Status: Ativo</span>
                                </div>
                            </div>

                            <button
                                onClick={() => setIsMinimized(!isMinimized)}
                                className="p-1.5 hover:bg-black/5 rounded-lg transition-colors text-gray-400 group"
                            >
                                {isMinimized ? (
                                    <Maximize2 size={16} className="group-hover:text-emerald-700 transition-colors" />
                                ) : (
                                    <Minus size={16} className="group-hover:text-amber-700 transition-colors" />
                                )}
                            </button>
                        </div>

                        {/* Elegant Body */}
                        <motion.div
                            animate={{
                                height: isMinimized ? 0 : "auto",
                                opacity: isMinimized ? 0 : 1
                            }}
                            className="overflow-hidden"
                        >
                            <div className="bg-white/90 backdrop-blur-3xl border border-white shadow-2xl rounded-3xl p-4 flex flex-col gap-5">
                                {/* Action Buttons */}
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={handleRegenerate}
                                        className="group flex flex-col items-center gap-2 p-3 bg-gray-50 hover:bg-emerald-50 rounded-2xl transition-all border border-gray-100 hover:border-emerald-200"
                                    >
                                        <div className="p-2 bg-white rounded-xl shadow-sm group-hover:rotate-180 transition-transform duration-700 text-emerald-700">
                                            <RefreshCcw size={16} />
                                        </div>
                                        <span className="text-[9px] font-bold text-gray-400 group-hover:text-emerald-700 uppercase tracking-widest">Regerar</span>
                                    </button>

                                    <button
                                        onClick={togglePause}
                                        className="group flex flex-col items-center gap-2 p-3 bg-gray-50 hover:bg-amber-50 rounded-2xl transition-all border border-gray-100 hover:border-amber-200"
                                    >
                                        <div className="p-2 bg-white rounded-xl shadow-sm group-hover:scale-110 transition-transform text-amber-700">
                                            {isPaused ? <Play size={16} fill="currentColor" /> : <Pause size={16} fill="currentColor" />}
                                        </div>
                                        <span className="text-[9px] font-bold text-gray-400 group-hover:text-amber-700 uppercase tracking-widest">
                                            {isPaused ? "Retomar" : "Pausar"}
                                        </span>
                                    </button>
                                </div>

                                {/* Sliders / Status */}
                                <div className="space-y-4 pt-1">
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <Wind size={12} className="text-sky-600" />
                                                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Vento: <span className="text-gray-900">{windLevel}</span></span>
                                            </div>
                                            <button
                                                onClick={nextWindLevel}
                                                className="text-[9px] px-2 py-0.5 bg-sky-50 text-sky-700 font-bold border border-sky-100 rounded-full hover:bg-sky-100 transition-colors uppercase tracking-widest"
                                            >
                                                Alterar
                                            </button>
                                        </div>
                                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={false}
                                                animate={{ width: windLevel === 'Off' ? "0%" : windLevel === 'Calm' ? "50%" : "100%" }}
                                                className="h-full bg-gradient-to-r from-sky-400 to-sky-300 shadow-[0_0_8px_rgba(56,189,248,0.5)]"
                                            />
                                        </div>
                                    </div>

                                    {/* Toggle Switch */}
                                    <div className="flex items-center justify-between p-3 bg-gray-50/50 rounded-2xl border border-gray-100">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-1.5 bg-white rounded-lg shadow-sm">
                                                <Zap size={14} className={cn("transition-colors", reduceMotion ? "text-gray-300" : "text-amber-500")} />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-gray-800 uppercase tracking-wide">Performance</span>
                                                <span className="text-[8px] text-gray-400 font-medium">
                                                    {reduceMotion ? "Modo Rápido" : "Melhor Visual"}
                                                </span>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleTogglePerformance}
                                            className={cn(
                                                "w-9 h-5 rounded-full p-1 transition-all duration-300 relative",
                                                reduceMotion ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]" : "bg-gray-200"
                                            )}
                                        >
                                            <motion.div
                                                animate={{
                                                    x: reduceMotion ? 16 : 0,
                                                    scale: reduceMotion ? [1, 1.1, 1] : 1
                                                }}
                                                transition={{
                                                    x: { type: "spring", stiffness: 500, damping: 30 },
                                                    scale: { repeat: Infinity, duration: 2, ease: "easeInOut" }
                                                }}
                                                className="w-3 h-3 bg-white rounded-full shadow-md"
                                            />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
