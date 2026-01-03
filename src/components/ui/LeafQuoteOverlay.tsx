import React from 'react';
import { useStore } from '../../store/useStore';

export const LeafQuoteOverlay: React.FC = () => {
    const { activeTab } = useStore();

    if (activeTab !== 'explore') return null;

    return (
        <div
            className="absolute inset-0 z-30 flex flex-col items-center justify-center pointer-events-none transition-opacity duration-1000 opacity-100 animate-in fade-in"
        >
            {/* Darker overlay for Explore mode to make text pop */}
            <div className="absolute inset-0 bg-boho-dark/20 backdrop-blur-sm -z-10" />

            <div className="relative w-full max-w-4xl flex items-center justify-center">
                {/* Horizontal Leaf Image */}
                <img
                    src="/leaf_banner.png"
                    alt="Magic Leaf"
                    className="w-[80vw] max-w-[600px] h-auto object-contain drop-shadow-2xl animate-float-slow opacity-90"
                />

                {/* Centered Text Overlay */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <h1 className="font-['Great_Vibes'] text-4xl md:text-6xl text-boho-dark text-center drop-shadow-md select-none leading-tight pb-4">
                        A Natureza Sussurra <br />
                        <span className="text-5xl md:text-7xl">Segredos Antigos.</span>
                    </h1>
                </div>
            </div>
        </div>
    );
};
