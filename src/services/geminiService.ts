import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = API_KEY ? new GoogleGenerativeAI(API_KEY) : null;

export interface DesignProposal {
    diagnosis: string;
    concept: string;
    variants: {
        id: string;
        title: string;
        description: string;
        visualTraits: string[];
    }[];
}

export const generateDesignProposal = async (emotionName: string, intensity: number): Promise<DesignProposal> => {
    if (!genAI) {
        console.warn("Gemini API Key missing. Returning mock data.");
        return getMockProposal(emotionName);
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
      Você é um especialista em design emocional e arte generativa para a aplicação "Árvore das Emoções".
      
      Contexto: O usuário está sentindo "${emotionName}" com intensidade ${intensity}/5.
      Seu objetivo é criar um diagnóstico poético e 3 variantes de design baseadas no conceito "Lente Fragmentada" (estética geométrica, caleidoscópica, fragmentos de vidro, luz prismática).

      Retorne APENAS um JSON válido seguindo este formato:
      {
        "diagnosis": "Diagnóstico poético da emoção...",
        "concept": "Conceito visual para esta emoção...",
        "variants": [
          {
            "id": "v1",
            "title": "Título da Variante 1",
            "description": "Descrição específica da variante 1...",
            "visualTraits": ["Traço 1", "Traço 2"]
          },
          ... 3 variantes no total
        ]
      }
    `;

        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Clean JSON from potential markdown tags
        const jsonStr = text.replace(/```json|```/g, "").trim();
        return JSON.parse(jsonStr) as DesignProposal;

    } catch (error) {
        console.error("Error generating design proposal:", error);
        return getMockProposal(emotionName);
    }
};

const getMockProposal = (emotionName: string): DesignProposal => ({
    diagnosis: `Sua sensação de ${emotionName} parece transbordar em fragmentos de luz e cor.`,
    concept: "Geometria Orgânica sob Prisma",
    variants: [
        {
            id: "v1",
            title: "Cristalização Suave",
            description: "Fragmentos que se unem em padrões harmônicos e circulares.",
            visualTraits: ["Bordas arredondadas", "Glow interno", "Cores pastéis"]
        },
        {
            id: "v2",
            title: "Vórtice Cromático",
            description: "Uma explosão de cores que gira em torno do centro da emoção.",
            visualTraits: ["Gradients dinâmicos", "Movimento espiral", "Alto contraste"]
        },
        {
            id: "v3",
            title: "Reflexo Quebrado",
            description: "A emoção vista através de múltiplos prismas de vidro.",
            visualTraits: ["Linhas afiadas", "Transparências sobrepostas", "Refrações"]
        }
    ]
});
