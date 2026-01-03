import React from 'react';
import type { EmotionData } from '../../types';

interface ListViewProps {
    emotions: EmotionData[];
    onLeafClick: (emotion: EmotionData) => void;
}

export const ListView: React.FC<ListViewProps> = ({ emotions, onLeafClick }) => {
    return (
        <div className="fixed inset-0 bg-[#fdfbf7] p-8 overflow-y-auto">
            <div className="max-w-4xl mx-auto">
                <header className="mb-12">
                    <span className="text-xs font-bold tracking-[0.2em] text-boho-clay uppercase mb-3 block opacity-80">
                        Visualização Alternativa
                    </span>
                    <h2 className="text-4xl font-serif font-medium text-boho-dark mb-4">
                        Suas Emoções
                    </h2>
                    <p className="text-boho-text text-lg italic">
                        "Onde as palavras encontram refúgio quando a floresta silencia."
                    </p>
                </header>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {emotions.map((emotion) => (
                        <button
                            key={emotion.id}
                            onClick={() => onLeafClick(emotion)}
                            className="text-left group bg-white/50 backdrop-blur-sm border border-boho-sage/20 p-6 rounded-3xl hover:bg-white hover:shadow-xl hover:shadow-boho-sage/5 transition-all duration-300"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div
                                    className="w-4 h-4 rounded-full shadow-inner"
                                    style={{ backgroundColor: emotion.color }}
                                />
                                <span className="text-[10px] font-bold text-boho-clay/40 uppercase tracking-widest">
                                    {new Date(emotion.timestamp ?? 0).toLocaleDateString('pt-BR')}
                                </span>
                            </div>

                            <h3 className="text-xl font-serif text-boho-dark mb-3 line-clamp-2 leading-tight">
                                {emotion.text}
                            </h3>

                            <div className="flex flex-wrap gap-2">
                                <span className="px-2 py-1 bg-boho-sage/10 text-boho-sage text-[10px] font-bold rounded-lg uppercase tracking-tighter">
                                    Reflexão
                                </span>
                            </div>
                        </button>
                    ))}
                </div>

                {emotions.length === 0 && (
                    <div className="text-center py-24 opacity-40">
                        <p className="font-serif italic">Nenhuma semente plantada ainda...</p>
                    </div>
                )}
            </div>
        </div>
    );
};
