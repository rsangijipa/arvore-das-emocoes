import React from 'react';
import { RefreshCcw } from 'lucide-react';
import { soundManager } from '../../utils/SoundManager';

interface UIOverlayProps {
    onRegenerate: () => void;
    quality: string;
    onQualityChange: (quality: string) => void;
    seed: number;
    reduceMotion: boolean;
    onReduceMotionChange: (val: boolean) => void;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({
    onRegenerate,
    quality,
    onQualityChange,
    seed,
    reduceMotion,
    onReduceMotionChange
}) => {
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
                    <span className="text-[10px] font-bold tracking-widest text-boho-clay/60 uppercase">Qualidade Visual</span>
                    <div className="flex gap-2 p-1 bg-boho-clay/5 rounded-2xl">
                        {['Low', 'Balanced', 'High'].map((q) => (
                            <button
                                key={q}
                                onClick={() => onQualityChange(q)}
                                className={`
                                    flex-1 py-1.5 px-3 rounded-xl text-[10px] font-bold transition-all duration-300
                                    ${quality === q
                                        ? 'bg-white text-boho-terracotta shadow-sm'
                                        : 'text-boho-clay/40 hover:text-boho-clay/60'}
                                `}
                            >
                                {q === 'Low' ? 'ECONÔMICO' : q === 'Balanced' ? 'EQUILIBRADO' : 'QUALIDADE'}
                            </button>
                        ))}
                    </div>
                    <div className="flex flex-col gap-4 mt-6 pt-6 border-t border-boho-clay/10">
                        <label className="flex items-center justify-between cursor-pointer group">
                            <span className="text-[10px] font-bold tracking-widest text-boho-clay/60 uppercase">Reduzir Movimento</span>
                            <div
                                onClick={() => onReduceMotionChange(!reduceMotion)}
                                className={`w-10 h-5 rounded-full p-1 transition-colors duration-300 ${reduceMotion ? 'bg-boho-sage' : 'bg-boho-clay/20'}`}
                            >
                                <div className={`w-3 h-3 bg-white rounded-full transition-transform duration-300 ${reduceMotion ? 'translate-x-5' : 'translate-x-0'}`} />
                            </div>
                        </label>
                    </div>
                </div>
            </div>
        </div>
    );
};
