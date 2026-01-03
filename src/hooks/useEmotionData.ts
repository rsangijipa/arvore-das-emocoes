import { useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { EmotionData } from '../types';

const RAW_EMOTIONS = [
    { text: "Gratidão", color: "#F4A460", reflection: "A gratidão transforma o que temos em suficiente." },
    { text: "Ansiedade", color: "#8B4513", reflection: "A ansiedade é o sofrimento pelo futuro. Respire no agora." },
    { text: "Alegria", color: "#FFD700", reflection: "A alegria está nas coisas simples da vida." },
    { text: "Tristeza", color: "#4682B4", reflection: "A tristeza é o preço que pagamos pelo amor. Permita-se sentir." },
    { text: "Esperança", color: "#98FB98", reflection: "A esperança é a última que morre e a primeira a nos levantar." },
    { text: "Medo", color: "#2F4F4F", reflection: "O medo aponta onde precisamos de mais coragem." },
    { text: "Amor", color: "#FF69B4", reflection: "O amor é a força mais sutil e poderosa do mundo." },
    { text: "Raiva", color: "#CD5C5C", reflection: "A raiva sinaliza limites ultrapassados. Use-a para proteção, não destruição." },
];

export const useEmotionData = (count: number = 50) => {
    const emotions = useMemo<EmotionData[]>(() => {
        return Array.from({ length: count }).map((_, i) => {
            const base = RAW_EMOTIONS[i % RAW_EMOTIONS.length];
            // Add slight color variation
            return {
                id: uuidv4(),
                text: base.text,
                reflection: base.reflection,
                color: base.color,
            };
        });
    }, [count]);

    return emotions;
};
