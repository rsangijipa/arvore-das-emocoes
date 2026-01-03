import { useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { EmotionData } from '../types';

const RAW_EMOTIONS = [
    { text: "Gratidão", color: "#F4A460", category: 'alegria', subcategory: 'reconhecimento', intensity: 4, tags: ['paz', 'conectividade'] },
    { text: "Ansiedade", color: "#8B4513", category: 'medo', subcategory: 'antecipação', intensity: 5, tags: ['alerta', 'tensão'] },
    { text: "Alegria", color: "#FFD700", category: 'alegria', subcategory: 'entusiasmo', intensity: 5, tags: ['brilho', 'energia'] },
    { text: "Saudade", color: "#4682B4", category: 'tristeza', subcategory: 'melancolia', intensity: 3, tags: ['memória', 'distância'] },
    { text: "Esperança", color: "#98FB98", category: 'alegria', subcategory: 'otimismo', intensity: 4, tags: ['futuro', 'luz'] },
    { text: "Incerto", color: "#2F4F4F", category: 'medo', subcategory: 'dúvida', intensity: 2, tags: ['névoa', 'cautela'] },
    { text: "Amor", color: "#FF69B4", category: 'amor', subcategory: 'ternura', intensity: 5, tags: ['afeto', 'união'] },
    { text: "Raiva", color: "#CD5C5C", category: 'raiva', subcategory: 'indignação', intensity: 4, tags: ['limites', 'fogo'] },
];

export const useEmotionData = (count: number = 50) => {
    const emotions = useMemo<EmotionData[]>(() => {
        return Array.from({ length: count }).map((_, i) => {
            const base = RAW_EMOTIONS[i % RAW_EMOTIONS.length];
            return {
                id: uuidv4(),
                text: base.text,
                reflection: "Reflexão sobre " + base.text + "...",
                color: base.color,
                category: base.category as any,
                subcategory: base.subcategory,
                intensity: base.intensity,
                tags: base.tags,
                timestamp: Date.now() - Math.random() * 1000000000,
            };
        });
    }, [count]);

    return emotions;
};
