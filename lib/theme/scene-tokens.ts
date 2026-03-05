import type { QualityConfig, QualityProfile } from "@/types/performance";

export type SceneMood = "sunset" | "dawn" | "night-calm";

export const SCENE_MOOD_OPTIONS: Array<{ value: SceneMood; label: string }> = [
  { value: "sunset", label: "Entardecer" },
  { value: "dawn", label: "Amanhecer" },
  { value: "night-calm", label: "Noite calma" },
];

type SceneSky = {
  background: string;
  fogColor: string;
  fogNear: number;
  fogFar: number;
  top: readonly [number, number, number];
  middle: readonly [number, number, number];
  horizon: readonly [number, number, number];
  base: readonly [number, number, number];
};

type SceneMoodPreset = {
  sky: SceneSky;
  exposure: number;
};

export const SCENE_QUALITY_CONFIGS: Record<QualityProfile, QualityConfig> = {
  high: { profile: "high", leafCount: 860, particleCount: 120, branchDepth: 5, dpr: 1.8 },
  medium: { profile: "medium", leafCount: 520, particleCount: 72, branchDepth: 4, dpr: 1.35 },
  safe: { profile: "safe", leafCount: 280, particleCount: 36, branchDepth: 3, dpr: 1.05 },
};

export const SCENE_LIGHTING_PRESETS: Record<
  QualityProfile,
  {
    ambient: number;
    hemi: number;
    key: number;
    fill: number;
    rim: number;
    selection: number;
    shadowMap: 1024 | 2048;
  }
> = {
  high: { ambient: 0.28, hemi: 0.15, key: 2.08, fill: 0.5, rim: 0.55, selection: 0.52, shadowMap: 2048 },
  medium: { ambient: 0.27, hemi: 0.13, key: 1.98, fill: 0.44, rim: 0.5, selection: 0.48, shadowMap: 2048 },
  safe: { ambient: 0.25, hemi: 0.1, key: 1.84, fill: 0.38, rim: 0.44, selection: 0.44, shadowMap: 1024 },
};

const SCENE_MOOD_PRESETS: Record<SceneMood, SceneMoodPreset> = {
  sunset: {
    sky: {
      background: "#0E2235",
      fogColor: "#2E4354",
      fogNear: 6,
      fogFar: 26,
      top: [0.05, 0.13, 0.21],
      middle: [0.18, 0.26, 0.33],
      horizon: [0.85, 0.7, 0.55],
      base: [0.91, 0.84, 0.76],
    },
    exposure: 0.92,
  },
  dawn: {
    sky: {
      background: "#14273B",
      fogColor: "#3F5A6A",
      fogNear: 6,
      fogFar: 25,
      top: [0.08, 0.16, 0.25],
      middle: [0.26, 0.34, 0.41],
      horizon: [0.9, 0.76, 0.63],
      base: [0.94, 0.88, 0.8],
    },
    exposure: 0.95,
  },
  "night-calm": {
    sky: {
      background: "#0A1422",
      fogColor: "#1B2A3F",
      fogNear: 6,
      fogFar: 22,
      top: [0.03, 0.07, 0.13],
      middle: [0.11, 0.18, 0.28],
      horizon: [0.37, 0.44, 0.55],
      base: [0.2, 0.25, 0.33],
    },
    exposure: 0.86,
  },
};

const CURATED_TREE_SEEDS: Record<QualityProfile, number[]> = {
  high: [38217, 90431, 17653, 64891, 22039],
  medium: [38217, 17653, 9347, 22039, 51821],
  safe: [38217, 17653, 22039],
};

export const DEFAULT_SCENE_MOOD: SceneMood = "sunset";

export function getSceneMoodPreset(mood: SceneMood): SceneMoodPreset {
  return SCENE_MOOD_PRESETS[mood] ?? SCENE_MOOD_PRESETS[DEFAULT_SCENE_MOOD];
}

export function inferSceneMoodByHour(date = new Date()): SceneMood {
  const hour = date.getHours();
  if (hour >= 5 && hour <= 10) {
    return "dawn";
  }

  if (hour >= 18 || hour <= 4) {
    return "night-calm";
  }

  return "sunset";
}

export function getCuratedTreeSeed(profile: QualityProfile, mood: SceneMood, sessionKey: string | null): number {
  const pool = CURATED_TREE_SEEDS[profile];
  if (!pool?.length) {
    return 38217;
  }

  let hash = 0;
  const source = `${sessionKey ?? "session"}:${profile}:${mood}`;
  for (let index = 0; index < source.length; index += 1) {
    hash = (hash << 5) - hash + source.charCodeAt(index);
    hash |= 0;
  }

  const selected = Math.abs(hash) % pool.length;
  return pool[selected];
}

export function vec3Token([r, g, b]: readonly [number, number, number]) {
  return `vec3(${r.toFixed(2)}, ${g.toFixed(2)}, ${b.toFixed(2)})`;
}
