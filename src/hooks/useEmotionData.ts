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

        // Shuffle the RAW_MESSAGES to get 'count' random ones if count < 100
        // But if count represents the tree size, we might want to repeat or fill.

        // Deterministic shuffle
        const indices = Array.from({ length: RAW_MESSAGES.length }, (_, i) => i);
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(rng() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }

        return Array.from({ length: count }).map((_, i) => {
            // Cycle through shuffled messages
            const msgIndex = indices[i % indices.length];
            const base = RAW_MESSAGES[msgIndex];

            const visuals = mapCategoryToVisuals(base.category);
            const drift = Math.floor(rng() * 1000000000);

            return {
                id: uuidv4(), // Unique instance ID
                text: base.category.charAt(0).toUpperCase() + base.category.slice(1), // Title case category as "Emotion Name"
                reflection: base.message, // The full quote
                color: visuals.color,
                category: visuals.category,
                subcategory: base.tags[0] || 'geral',
                intensity: 3 + Math.floor(rng() * 3), // Random intensity 3-5
                tags: [...base.tags, base.tone],
                timestamp: baseTimestamp - drift,
                textureUrl: `/textures/leaves/leaf_tex_0${Math.floor(rng() * 5) + 1}.png`,
            };
        });
    }, [count, seed]);

    return emotions;
};
