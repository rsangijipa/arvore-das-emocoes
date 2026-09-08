export const EMOTIONS = ["calm", "happy", "sad", "irritated", "worried", "tired", "overwhelmed", "unsure"] as const;

export type Emotion = (typeof EMOTIONS)[number];
export type SensoryMode = "default" | "calm" | "minimal";

export type EmotionalActivity = {
  type: "breathing" | "grounding" | "body" | "action" | "reflection" | "message";
  durationMs?: number;
  completed: boolean;
};

export type EmotionalSession = {
  emotionBefore?: Emotion;
  intensityBefore?: number;
  emotionAfter?: Emotion;
  intensityAfter?: number;
  activities: EmotionalActivity[];
  startedAt: string;
  completedAt?: string;
};

export type EmotionalSceneProfile = {
  wind: number;
  particleIntensity: number;
  ambientLight: number;
  saturation: number;
};

export function getEmotionalSceneProfile(emotion?: Emotion, intensity = 1, completedActivities = 0): EmotionalSceneProfile {
  const level = Math.min(5, Math.max(1, intensity)) / 5;
  const settle = Math.min(0.42, completedActivities * 0.14);
  if (emotion === "worried" || emotion === "overwhelmed") return { wind: Math.max(0.28, 0.45 + level * 0.4 - settle), particleIntensity: Math.max(0.18, 0.35 + level * 0.35 - settle), ambientLight: 0.94 + settle * 0.12, saturation: 0.84 };
  if (emotion === "irritated") return { wind: Math.max(0.26, 0.4 + level * 0.35 - settle), particleIntensity: Math.max(0.18, 0.32 + level * 0.25 - settle), ambientLight: 1.02, saturation: 0.92 };
  if (emotion === "sad" || emotion === "tired") return { wind: 0.22, particleIntensity: 0.24, ambientLight: 0.91, saturation: 0.78 };
  return { wind: 0.28, particleIntensity: 0.3, ambientLight: 1, saturation: 1 };
}
