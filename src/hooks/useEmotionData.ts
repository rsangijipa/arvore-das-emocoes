import { useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { EmotionData } from '../types';
import { createRng } from '../utils/random';
import { RAW_MESSAGES } from '../data/messages';

// Helper to map category/tags to color and broad category
const mapCategoryToVisuals = (cat: string): { color: string; category: EmotionData['category'] } => {
    const c = cat.toLowerCase();

    // Warm/Positive -> Alegria/Amor (Golds, Pinks, Warm Greens)
    if (['alegria', 'amor', 'gratidão', 'coragem', 'recomeço', 'progresso', 'prosperidade', 'cura', 'motivação'].includes(c)) {
        return { color: '#FFD700', category: 'alegria' };
    }
    // Deep/Reflective -> Outros/Amor (Blues, Teals)
    if (['paz', 'sabedoria', 'presença', 'clareza', 'reflexão', 'intuicão', 'sentido', 'confiança'].includes(c)) {
        return { color: '#4682B4', category: 'amor' };
    }
    // Hard/Firm -> Raiva/Coragem (Reds, Oranges)
    if (['raiva', 'limites', 'disciplina', 'resiliência', 'força', 'constância', 'integridade'].includes(c)) {
        return { color: '#CD5C5C', category: 'raiva' };
    }
    // Heavy -> Tristeza/Medo (Greys, Dark Blues)
    if (['tristeza', 'medo', 'ansiedade', 'dor', 'sofrimento'].includes(c)) {
        return { color: '#2F4F4F', category: 'medo' };
    }

    // Default fallback
    return { color: '#b59922', category: 'outros' };
};

export const useEmotionData = (count: number = 50, seed: number = 1337) => {
    const emotions = useMemo<EmotionData[]>(() => {
        const rng = createRng(seed + count);
        const baseTimestamp = new Date('2024-01-01T00:00:00Z').getTime();

        // Deterministic shuffle of raw messages to select 'count' unique messages
        const messageIndices = Array.from({ length: RAW_MESSAGES.length }, (_, i) => i);
        for (let i = messageIndices.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [messageIndices[i], messageIndices[j]] = [messageIndices[j], messageIndices[i]];
        }

        // Texture distribution for 10 items: 2 of each [1..5]
        // If count != 10, we cycle or clamp. For strict 10 leaf requirement:
        // We create a pool of texture indices: [1,1, 2,2, 3,3, 4,4, 5,5]
        const hardcodedTextures = [1, 1, 2, 2, 3, 3, 4, 4, 5, 5];
        while (hardcodedTextures.length < count) {
            // Fill remaining if count > 10 (fallback)
            hardcodedTextures.push(Math.floor(rng() * 5) + 1);
        }

        // Shuffle the texture assignments so they don't map linearly to the message list
        for (let i = hardcodedTextures.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [hardcodedTextures[i], hardcodedTextures[j]] = [hardcodedTextures[j], hardcodedTextures[i]];
        }

        return Array.from({ length: count }).map((_, i) => {
            // Pick message
            const msgIndex = messageIndices[i % messageIndices.length];
            const base = RAW_MESSAGES[msgIndex];

            // Mock missing metadata for simple messages
            const categoryList: string[] = ['alegria', 'amor', 'gratidão', 'paz', 'coragem', 'reflexão'];
            const category = categoryList[i % categoryList.length];
            const visuals = mapCategoryToVisuals(category);
            const drift = Math.floor(rng() * 1000000000);

            // Pick strict texture
            const texNum = hardcodedTextures[i];

            return {
                id: uuidv4(),
                text: category.charAt(0).toUpperCase() + category.slice(1),
                reflection: base.text, // The actual quote
                color: visuals.color,
                category: visuals.category,
                subcategory: 'geral',
                intensity: 3 + Math.floor(rng() * 3),
                tags: ['cinematic', 'quote'],
                timestamp: baseTimestamp - drift,
                textureUrl: `/textures/leaves/leaf_tex_0${texNum}.jpg`,
            };
        });
    }, [count, seed]);

    return emotions;
};
