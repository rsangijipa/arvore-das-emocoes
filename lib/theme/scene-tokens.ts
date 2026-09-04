import * as THREE from "three";

import type { QualityConfig, QualityProfile } from "@/types/performance";

/**
 * Posicao viva do sol artificial.
 *
 * O vetor e MUTAVEL de proposito: a cena reposiciona o sol a cada frame para que
 * ele fique sempre atras e acima de quem observa — assim a arvore nunca vira
 * silhueta contra a luz, nao importa de que angulo o usuario gire a camera.
 * Folhas e folha-heroi leem este mesmo objeto para calcular a translucidez.
 */
export const SUN_POSITION = new THREE.Vector3(7.5, 11.5, 5.5);

/** sol do ceu (drei/Sky): fixo, so define o gradiente do horizonte */
export const SKY_SUN_POSITION: [number, number, number] = [6, 22, 10];

/** deslocamento angular do sol em relacao a camera (rad) */
export const SUN_CAMERA_YAW = 0.62;

/** quantidade máxima de folhas que carregam mensagem */
export const MESSAGE_LEAF_COUNT = 10;

/**
 * Calcula quantas folhas-mensagem cabem bem em uma copa de dado raio.
 * Clampado entre 6 e 14 para garantir variedade sem superlotação.
 */
export function calcMessageLeafCount(crownRadius: number): number {
  return Math.max(6, Math.min(14, Math.round(crownRadius * 2.5)));
}

export const SCENE_QUALITY_CONFIGS: Record<QualityProfile, QualityConfig> = {
  high: {
    profile: "high",
    leafCount: 2300,
    branchOrder: 4,
    detail: 1,
    leafDensity: 1.25,
    dpr: 1.8,
    shadows: true,
    shadowMapSize: 2048,
    windStrength: 0.021,
    windParticles: 320,
  },
  medium: {
    profile: "medium",
    leafCount: 1450,
    branchOrder: 4,
    detail: 0.8,
    leafDensity: 1.05,
    dpr: 1.4,
    shadows: true,
    shadowMapSize: 1024,
    windStrength: 0.021,
    windParticles: 190,
  },
  safe: {
    profile: "safe",
    leafCount: 780,
    branchOrder: 3,
    detail: 0.62,
    leafDensity: 0.85,
    dpr: 1.05,
    shadows: false,
    shadowMapSize: 1024,
    windStrength: 0.016,
    windParticles: 90,
  },
};

/**
 * Semente da arvore.
 *
 * A arvore deve se reconstruir a cada abertura, entao a semente e sorteada em
 * runtime. Ela NAO depende do perfil de qualidade: se a cena cair de "high" para
 * "medium" no meio da sessao, a silhueta continua a mesma (so muda a tesselacao).
 */
export function createTreeSeed(): number {
  return Math.floor(Math.random() * 0x7fffffff) + 1;
}
