import React from 'react';
import { RefreshCcw } from 'lucide-react';

interface UIOverlayProps {
    onRegenerate: () => void;
}

export const UIOverlay: React.FC<UIOverlayProps> = ({ onRegenerate }) => {
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

                <button
                    onClick={onRegenerate}
                    className="
                        group flex items-center justify-center gap-3 w-full py-4 px-6
                        bg-boho-terracotta hover:bg-boho-clay text-white
                        font-serif tracking-wider font-medium text-sm rounded-full
                        shadow-lg shadow-boho-terracotta/20 
                        transition-all duration-300 ease-out
                        active:scale-[0.98]
                    "
                >
                    <RefreshCcw size={18} className="transition-transform group-hover:-rotate-180 duration-700 opacity-90" />
                    Renovar Árvore
                </button>
            </div>
        </div>
    );
};
