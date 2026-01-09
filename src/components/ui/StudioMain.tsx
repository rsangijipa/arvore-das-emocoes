import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, ArrowRight, Loader2, Save, RefreshCw } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { generateDesignProposal } from '../../services/geminiService';
import { cn } from '../../utils/cn';

export const StudioMain: React.FC = () => {
    const { emotions, studioProposal, setStudioProposal } = useStore();
    const [selectedEmotionId, setSelectedEmotionId] = useState<string | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async () => {
        if (!selectedEmotionId) return;
        const emotion = emotions.find(e => e.id === selectedEmotionId);
        if (!emotion) return;

        setIsGenerating(true);
        try {
            const proposal = await generateDesignProposal(emotion.category, emotion.intensity);
            setStudioProposal(proposal);
        } catch (error) {
            console.error(error);
        } finally {
            setIsGenerating(false);
        }
    };

    const selectedEmotion = emotions.find(e => e.id === selectedEmotionId);

    return (
        <div className="absolute inset-0 z-[100] flex items-center justify-center p-6 bg-black/20 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-4xl h-[80vh] bg-white/90 backdrop-blur-2xl rounded-[2.5rem] border border-white shadow-2xl flex flex-col overflow-hidden"
            >
                {/* Header */}
                <div className="p-8 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-serif text-gray-800 flex items-center gap-3">
                            <Sparkles className="text-emerald-600" />
                            Studio de IA
                        </h2>
                        <p className="text-sm text-gray-500 mt-1 uppercase tracking-widest">Transforme emoções em arte geométrica</p>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left: Emotion Selection */}
                    <div className="space-y-6">
                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">1. Selecione a Emoção Guia</h3>
                        <div className="grid grid-cols-2 gap-3">
                            {emotions.map((emotion) => (
                                <button
                                    key={emotion.id}
                                    onClick={() => setSelectedEmotionId(emotion.id)}
                                    className={cn(
                                        "p-4 rounded-2xl border-2 transition-all duration-300 text-left group",
                                        selectedEmotionId === emotion.id
                                            ? "border-emerald-500 bg-emerald-50/50"
                                            : "border-gray-50 bg-white hover:border-emerald-200"
                                    )}
                                >
                                    <div className="w-8 h-8 rounded-lg mb-3" style={{ backgroundColor: emotion.color }} />
                                    <span className="block font-serif text-gray-800">{emotion.category}</span>
                                    <span className="text-[10px] text-gray-400 uppercase tracking-tighter">{emotion.subcategory}</span>
                                </button>
                            ))}
                        </div>

                        {selectedEmotion && (
                            <motion.button
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className="w-full py-4 bg-gray-900 text-white rounded-2xl font-serif flex items-center justify-center gap-3 hover:bg-emerald-800 transition-colors disabled:opacity-50"
                            >
                                {isGenerating ? (
                                    <>
                                        <Loader2 className="animate-spin" />
                                        Consultando o Destino...
                                    </>
                                ) : (
                                    <>
                                        Gerar Proposta de Design
                                        <ArrowRight size={18} />
                                    </>
                                )}
                            </motion.button>
                        )}
                    </div>

                    {/* Right: AI Result */}
                    <div className="bg-gray-50/50 rounded-3xl p-6 border border-gray-100 flex flex-col">
                        <AnimatePresence mode="wait">
                            {studioProposal ? (
                                <motion.div
                                    key="result"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-6"
                                >
                                    <div>
                                        <h3 className="text-xs font-black uppercase tracking-widest text-emerald-600 mb-2">Diagnóstico Emocional</h3>
                                        <p className="text-serif text-gray-700 italic leading-relaxed">"{studioProposal.diagnosis}"</p>
                                    </div>

                                    <div>
                                        <h3 className="text-xs font-black uppercase tracking-widest text-gray-400 mb-4">Variantes de Design</h3>
                                        <div className="space-y-4">
                                            {studioProposal.variants.map((variant: { id: string, title: string, description: string, visualTraits: string[] }) => (
                                                <div key={variant.id} className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm">
                                                    <h4 className="font-serif text-gray-800 mb-1">{variant.title}</h4>
                                                    <p className="text-xs text-gray-500 mb-3">{variant.description}</p>
                                                    <div className="flex flex-wrap gap-2">
                                                        {variant.visualTraits.map((trait: string) => (
                                                            <span key={trait} className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] rounded-md font-medium uppercase">
                                                                {trait}
                                                            </span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-4">
                                        <button className="flex-1 py-3 bg-emerald-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                                            <Save size={14} /> Salvar Favorito
                                        </button>
                                        <button
                                            onClick={handleGenerate}
                                            className="p-3 bg-gray-100 text-gray-600 rounded-xl hover:bg-gray-200 transition-colors"
                                        >
                                            <RefreshCw size={18} />
                                        </button>
                                    </div>
                                </motion.div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center text-center p-8 opacity-40">
                                    <div className="w-16 h-16 bg-gray-200 rounded-full mb-4 flex items-center justify-center">
                                        <Sparkles className="text-gray-400" />
                                    </div>
                                    <p className="text-serif text-gray-500">Aguardando semente emocional para florescer o design...</p>
                                </div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};
