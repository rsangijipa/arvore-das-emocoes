import React from 'react';
import { RefreshCcw, Play, Pause, Wind, Monitor, Maximize, HelpCircle } from 'lucide-react';
import { soundManager } from '../../utils/SoundManager';

import { useStore } from '../../store/useStore';

export const UIOverlay: React.FC = () => {
    const {
        seed,
        quality,
        reduceMotion,
        isCinematic,
        regenerateSeed,
        setQuality,
        setReduceMotion,
        setCinematic,
        windLevel,
        isPaused,
        setWindLevel,
        togglePause,
        triggerCameraReset,
        setFocusedEmotion
    } = useStore();

    // Hotkeys
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore if typing in input (though we don't have many)
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

            switch (e.key.toLowerCase()) {
                case 'r':
                    triggerCameraReset();
                    break;
                case ' ':
                    e.preventDefault(); // Prevent scroll
                    togglePause();
                    break;
                case 'q': {
                    const qualities = ['Low', 'Balanced', 'High'];
                    const next = qualities[(qualities.indexOf(quality) + 1) % qualities.length];
                    setQuality(next);
                    break;
                }
                case 'w': {
                    const levels: ('Off' | 'Calm' | 'Breezy')[] = ['Off', 'Calm', 'Breezy'];
                    const next = levels[(levels.indexOf(windLevel) + 1) % levels.length];
                    setWindLevel(next);
                    break;
                }
                case 'escape':
                    if (isCinematic) setCinematic(false);
                    setFocusedEmotion(null);
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [quality, windLevel, isCinematic, triggerCameraReset, togglePause, setQuality, setWindLevel, setCinematic, setFocusedEmotion]);

    const onRegenerate = regenerateSeed;
    // const onQualityChange = setQuality; // Removed as used directly
    const onReduceMotionChange = setReduceMotion;
    const onExitCinematic = () => setCinematic(false);
    if (isCinematic) {
        return (
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-20 flex gap-4">
                <button
                    onClick={() => {
                        soundManager.playRegenerate();
                        onRegenerate();
                    }}
                    className="
                        group flex items-center justify-center gap-3 py-3 px-8
                        bg-black/20 backdrop-blur-xl border border-white/10 text-white
                        font-serif tracking-widest font-medium text-xs uppercase rounded-full
                        hover:bg-white/10 hover:border-white/30 transition-all duration-500
                    "
                >
                    <RefreshCcw size={14} className="opacity-70 group-hover:rotate-180 transition-transform duration-700" />
                    Renovar Árvore
                </button>

                <button
                    onClick={onExitCinematic}
                    className="
                        group flex items-center justify-center gap-3 py-3 px-8
                        bg-white/90 backdrop-blur-xl border border-white/40 text-boho-dark
                        font-serif tracking-widest font-medium text-xs uppercase rounded-full
                        hover:bg-white hover:scale-105 transition-all duration-300 shadow-lg shadow-white/10
                    "
                >
                    Voltar
                </button>
            </div>
        );
    }

    return (
        <div className="absolute top-8 left-8 z-10 pointer-events-none">
            <div className="
                bg-white/30 backdrop-blur-md border border-white/20
                shadow-[0_8px_32px_rgba(62,50,40,0.1)] rounded-3xl p-8 max-w-sm
                pointer-events-auto transition-transform hover:scale-[1.01] duration-500
            ">
                <span className="text-xs font-bold tracking-[0.2em] text-boho-clay uppercase mb-3 block opacity-80">
                    Jornada Interior
                </span>
                <h1 className="text-5xl font-serif font-medium text-boho-dark drop-shadow-sm mb-4 leading-tight">
                    Árvore das Emoções
                </h1>
                <div className="w-16 h-1 bg-boho-sage rounded-full mb-5 opacity-70" />

                <p className="text-boho-text text-sm font-medium leading-relaxed italic mb-8">
                    "Explore sua paisagem interior. Cada folha, uma reflexão."
                </p>

                <div className="flex gap-3 mb-6">
                    <button
                        onClick={() => {
                            soundManager.playRegenerate();
                            onRegenerate();
                        }}
                        className="
                            group flex-1 flex items-center justify-center gap-3 py-4 px-6
                            bg-boho-terracotta hover:bg-boho-clay text-white
                            font-serif tracking-wider font-medium text-sm rounded-full
                            shadow-lg shadow-boho-terracotta/20 
                            transition-all duration-300 ease-out
                            active:scale-[0.98]
                        "
                    >
                        <RefreshCcw size={18} className="transition-transform group-hover:-rotate-180 duration-700 opacity-90" />
                        Renovar
                    </button>

                    <button
                        onClick={() => {
                            const url = new URL(window.location.href);
                            url.searchParams.set('seed', seed.toString());
                            navigator.clipboard.writeText(url.toString());
                            alert('Link com a semente copiado!');
                        }}
                        className="
                            p-4 bg-boho-sage/10 hover:bg-boho-sage text-boho-sage hover:text-white
                            rounded-full transition-all duration-300 active:scale-95
                        "
                        title="Copiar link da semente"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                    </button>
                </div>

                <div className="flex flex-col gap-2">
                    <span className="text-[10px] font-bold tracking-widest text-boho-clay/60 uppercase">Controles</span>

                    {/* Control Bar */}
                    <div className="flex flex-wrap gap-2 p-2 bg-boho-clay/5 rounded-2xl">
                        <button
                            onClick={() => triggerCameraReset()}
                            className="p-2 rounded-xl text-boho-clay/60 hover:bg-white hover:text-boho-terracotta transition-colors"
                            title="Resetar Câmera (R)"
                        >
                            <Maximize size={16} />
                        </button>

                        <button
                            onClick={togglePause}
                            className="p-2 rounded-xl text-boho-clay/60 hover:bg-white hover:text-boho-terracotta transition-colors"
                            title={isPaused ? "Retomar (Espaço)" : "Pausar (Espaço)"}
                        >
                            {isPaused ? <Play size={16} /> : <Pause size={16} />}
                        </button>

                        <button
                            onClick={() => {
                                const levels: ('Off' | 'Calm' | 'Breezy')[] = ['Off', 'Calm', 'Breezy'];
                                const next = levels[(levels.indexOf(windLevel) + 1) % levels.length];
                                setWindLevel(next);
                            }}
                            className="p-2 rounded-xl text-boho-clay/60 hover:bg-white hover:text-boho-terracotta transition-colors flex gap-1 items-center"
                            title={`Vento: ${windLevel} (W)`}
                        >
                            <Wind size={16} />
                            <span className="text-[10px] font-bold">{windLevel}</span>
                        </button>

                        <button
                            onClick={() => {
                                const qualities = ['Low', 'Balanced', 'High'];
                                const next = qualities[(qualities.indexOf(quality) + 1) % qualities.length];
                                setQuality(next);
                            }}
                            className="p-2 rounded-xl text-boho-clay/60 hover:bg-white hover:text-boho-terracotta transition-colors flex gap-1 items-center"
                            title={`Qualidade: ${quality} (Q)`}
                        >
                            <Monitor size={16} />
                            <span className="text-[10px] font-bold">{quality === 'Low' ? 'LO' : quality === 'Balanced' ? 'MED' : 'HI'}</span>
                        </button>
                    </div>

                    <div className="flex flex-col gap-4 mt-6 pt-6 border-t border-boho-clay/10">
                        <label className="flex items-center justify-between cursor-pointer group opacity-80 hover:opacity-100 transition-opacity">
                            <span className="text-[10px] font-bold tracking-widest text-boho-clay/60 uppercase">Reduzir Movimento</span>
                            <div
                                onClick={() => onReduceMotionChange(!reduceMotion)}
                                className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-300 ${reduceMotion ? 'bg-boho-sage' : 'bg-boho-clay/20'}`}
                            >
                                <div className={`w-3 h-3 bg-white rounded-full transition-transform duration-300 ${reduceMotion ? 'translate-x-4' : 'translate-x-0'}`} />
                            </div>
                        </label>
                        <div className="flex justify-between items-center opacity-60">
                            <div className="flex items-center gap-1">
                                <HelpCircle size={12} />
                                <span className="text-[10px]">Atalhos: R, Space, Q, W, Esc</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
