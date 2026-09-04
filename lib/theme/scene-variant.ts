/**
 * Variação sazonal/horária da cena.
 *
 * A hora local do dispositivo determina uma das quatro variantes visuais.
 * O valor é calculado uma única vez no bootstrap e nunca reatualiza em
 * runtime (a árvore não precisa mudar enquanto o usuário está na tela).
 */

export type SceneVariant = "morning" | "day" | "evening" | "night";

export function getSceneVariant(hour = new Date().getHours()): SceneVariant {
  if (hour >= 6 && hour < 10) return "morning";
  if (hour >= 10 && hour < 17) return "day";
  if (hour >= 17 && hour < 20) return "evening";
  return "night";
}

/** Tokens visuais por variante */
export type SceneVariantTokens = {
  /** cor do céu difuso (hemisphereLight) */
  skyColor: string;
  /** cor do solo refletido (hemisphereLight groundColor) */
  groundColor: string;
  /** cor da luz ambiente */
  ambientColor: string;
  /** intensidade da luz ambiente */
  ambientIntensity: number;
  /** cor do sol */
  sunColor: string;
  /** intensidade do sol */
  sunIntensity: number;
  /** intensidade emissiva extra das folhas-mensagem (halo mais quente à noite) */
  leafEmissiveBoost: number;
  /** multiplicador de opacidade do panorama — noite escurece o fundo */
  fogDensityMultiplier: number;
  /** cor de neblina */
  fogColor: string;
  /** exposição do tone mapping */
  toneMappingExposure: number;
};

export const SCENE_VARIANT_TOKENS: Record<SceneVariant, SceneVariantTokens> = {
  morning: {
    skyColor: "#B8D8F0",
    groundColor: "#5C7A42",
    ambientColor: "#C8DDF0",
    ambientIntensity: 0.42,
    sunColor: "#FFE8C8",
    sunIntensity: 2.4,
    leafEmissiveBoost: 0,
    fogDensityMultiplier: 1.1,   // névoa ligeiramente mais densa de manhã
    fogColor: "#D8EAF5",
    toneMappingExposure: 0.88,
  },
  day: {
    skyColor: "#CFE2F2",
    groundColor: "#6B7C4A",
    ambientColor: "#D7E6F3",
    ambientIntensity: 0.38,
    sunColor: "#FFE7BE",
    sunIntensity: 3.1,
    leafEmissiveBoost: 0,
    fogDensityMultiplier: 1.0,
    fogColor: "#E6F2F8",
    toneMappingExposure: 0.85,
  },
  evening: {
    skyColor: "#E8C882",
    groundColor: "#7A5C32",
    ambientColor: "#F0D8A8",
    ambientIntensity: 0.34,
    sunColor: "#FFAA44",
    sunIntensity: 2.6,
    leafEmissiveBoost: 0.12,     // folhas douradas no entardecer
    fogDensityMultiplier: 0.92,  // horizonte mais limpo no fim do dia
    fogColor: "#F5DEB0",
    toneMappingExposure: 0.92,
  },
  night: {
    skyColor: "#1A2A4A",
    groundColor: "#2A3A28",
    ambientColor: "#1E2D4A",
    ambientIntensity: 0.22,
    sunColor: "#7088A0",          // lua fria
    sunIntensity: 1.4,
    leafEmissiveBoost: 0.28,     // halos brilham mais no escuro
    fogDensityMultiplier: 0.8,
    fogColor: "#0E1824",
    toneMappingExposure: 0.75,
  },
};
