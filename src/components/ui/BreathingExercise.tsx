import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Wind, X, Circle } from 'lucide-react';
import { useStore } from '../../store/useStore';

const PHASES = [
    { label: 'Inspire', duration: 4, color: 'text-emerald-500', scale: 1.5 },
    { label: 'Segure', duration: 4, color: 'text-blue-500', scale: 1.5 },
    { label: 'Expire', duration: 4, color: 'text-amber-500', scale: 1.0 },
    { label: 'Pausa', duration: 2, color: 'text-gray-400', scale: 1.0 },
];

export const BreathingExercise: React.FC = () => {
    const { setActiveTab } = useStore();
    const [phaseIdx, setPhaseIdx] = useState(0);
    const [timeLeft, setTimeLeft] = useState(PHASES[0].duration);

    useEffect(() => {
        const timer = setInterval(() => {
            setTimeLeft((prev) => {
                if (prev <= 1) {
                    const nextIdx = (phaseIdx + 1) % PHASES.length;
                    setPhaseIdx(nextIdx);
                    return PHASES[nextIdx].duration;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(timer);
    }, [phaseIdx]);

    const currentPhase = PHASES[phaseIdx];

    return (
        <div className="absolute inset-0 z-[100] flex items-center justify-center bg-[#1a1c1e]/60 backdrop-blur-xl">
            <button
                onClick={() => setActiveTab('home')}
                className="absolute top-8 right-8 p-3 bg-white/10 text-white rounded-full hover:bg-white/20 transition-all border border-white/10"
            >
                <X size={24} />
            </button>

            <div className="flex flex-col items-center">
                {/* Breathing Circle Container */}
                <div className="relative flex items-center justify-center w-80 h-80">
                    {/* Outer Glows */}
                    <motion.div
                        initial={false}
                        animate={{
                            scale: currentPhase.scale,
                            opacity: [0.1, 0.3, 0.1]
                        }}
                        transition={{ duration: currentPhase.duration, ease: "easeInOut" }}
                        className="absolute inset-0 bg-emerald-500/20 rounded-full blur-3xl"
                    />

                    {/* Main Circle */}
                    <motion.div
                        initial={false}
                        animate={{
                            scale: currentPhase.scale,
                            borderColor: phaseIdx === 0 ? '#10b981' : phaseIdx === 2 ? '#f59e0b' : '#3b82f6'
                        }}
                        transition={{ duration: currentPhase.duration, ease: "easeInOut" }}
                        className="w-48 h-48 rounded-full border-4 flex items-center justify-center bg-white/5 backdrop-blur-md shadow-2xl"
                    >
                        <Circle className={currentPhase.color} size={32} />
                    </motion.div>

                    {/* Background Ring */}
                    <div className="absolute w-48 h-48 rounded-full border border-white/10" />
                </div>

                {/* Phase Label */}
                <div className="mt-12 text-center">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={currentPhase.label}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-2"
                        >
                            <h2 className={cn("text-4xl font-serif tracking-widest uppercase mb-1 transition-colors duration-1000", currentPhase.color)}>
                                {currentPhase.label}
                            </h2>
                            <p className="text-white/40 text-sm font-sans tracking-[0.3em] uppercase">
                                {timeLeft} Segundos
                            </p>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Bottom Tip */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 1 }}
                    className="fixed bottom-24 flex items-center gap-3 text-white/50 bg-white/5 px-6 py-3 rounded-full border border-white/5"
                >
                    <Wind size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-center">Sintonize sua respiração com o pulsar da luz</span>
                </motion.div>
            </div>
        </div>
    );
};

// Helper inside file for simplicity
function cn(...inputs: any[]) {
    return inputs.filter(Boolean).join(' ');
}
