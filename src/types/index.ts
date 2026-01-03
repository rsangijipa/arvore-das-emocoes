export interface EmotionData {
    id: string;
    text: string;           // The main emotion name
    reflection: string;     // Detailed text
    color: string;
    category: 'medo' | 'tristeza' | 'alegria' | 'raiva' | 'amor' | 'outros';
    subcategory: string;
    intensity: number;      // 1-5
    tags: string[];
    position?: [number, number, number];
    timestamp?: number;
}

export interface TreeConfig {
    levels: number;
    branchLength: number;
    branchRadius: number;
    leafCount: number;
}
