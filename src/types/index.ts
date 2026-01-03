export interface EmotionData {
    id: string;
    text: string;           // The main emotion name (e.g., "Gratitude")
    reflection: string;     // The deeper text shown in the modal
    color: string;          // Hex color for the leaf
    position?: [number, number, number]; // Optional, often calculated procedurally
}

export interface TreeConfig {
    levels: number;
    branchLength: number;
    branchRadius: number;
    leafCount: number;
}
