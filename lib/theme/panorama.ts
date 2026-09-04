import * as THREE from "three";

import type { SceneVariant } from "@/lib/theme/scene-variant";

/**
 * Panorama equirretangular 360 graus desenhado em SVG.
 * Aceita uma variante sazonal para ajustar o gradiente do céu.
 */

const VIEW_WIDTH = 4096;
const VIEW_HEIGHT = 2048;
const HORIZON = VIEW_HEIGHT / 2;

export const HORIZON_COLOR = "#E6F2F8";
export const SKY_TOP_COLOR = "#3E92D8";
export const GRASS_NEAR_COLOR = "#2F6D25";
export const GRASS_FAR_COLOR = "#8FC05A";

/** Paletas de céu por variante */
const SKY_PALETTES: Record<SceneVariant, { top: string; mid: string; low: string; horizon: string }> = {
  morning: {
    top: "#1A5FA8",
    mid: "#4A9AD4",
    low: "#A8CDE8",
    horizon: "#D8EAF5",
  },
  day: {
    top: "#2A7FCE",
    mid: "#3E92D8",
    low: "#93C9EF",
    horizon: HORIZON_COLOR,
  },
  evening: {
    top: "#8A3A20",
    mid: "#D06A28",
    low: "#F0A848",
    horizon: "#F5C878",
  },
  night: {
    top: "#060C18",
    mid: "#0E1830",
    low: "#1A2848",
    horizon: "#1C2E40",
  },
};

type Cloud = {
  x: number;
  y: number;
  scale: number;
  opacity: number;
};

/**
 * Nuvens baixas de bom tempo. Em equirretangular, y = 1024 e o horizonte e cada
 * 11.4 px equivalem a 1 grau de elevacao — por isso elas ficam entre 845 e 985:
 * a faixa que a camera realmente enquadra ao olhar para a arvore.
 */
const CLOUDS: Cloud[] = [
  { x: 210, y: 902, scale: 0.62, opacity: 0.95 },
  { x: 640, y: 958, scale: 0.34, opacity: 0.78 },
  { x: 1180, y: 922, scale: 0.48, opacity: 0.88 },
  { x: 1560, y: 976, scale: 0.24, opacity: 0.62 },
  { x: 2040, y: 886, scale: 0.55, opacity: 0.92 },
  { x: 2420, y: 962, scale: 0.3, opacity: 0.7 },
  { x: 2860, y: 908, scale: 0.68, opacity: 0.9 },
  { x: 3300, y: 970, scale: 0.27, opacity: 0.6 },
  { x: 3720, y: 896, scale: 0.52, opacity: 0.86 },
  { x: 4040, y: 948, scale: 0.38, opacity: 0.74 },
];

/** silhueta de uma nuvem baixa de bom tempo: base reta, topo em bolhas */
function cloudPath(x: number, y: number, scale: number) {
  const w = 260 * scale;
  const h = 74 * scale;

  return [
    `M ${x - w} ${y}`,
    `C ${x - w} ${y - h * 0.45} ${x - w * 0.78} ${y - h * 0.7} ${x - w * 0.55} ${y - h * 0.62}`,
    `C ${x - w * 0.48} ${y - h * 1.05} ${x - w * 0.1} ${y - h * 1.22} ${x + w * 0.06} ${y - h * 0.9}`,
    `C ${x + w * 0.24} ${y - h * 1.16} ${x + w * 0.62} ${y - h * 1.02} ${x + w * 0.68} ${y - h * 0.6}`,
    `C ${x + w * 0.86} ${y - h * 0.66} ${x + w} ${y - h * 0.42} ${x + w} ${y}`,
    "Z",
  ].join(" ");
}

/** cadeia de colinas emendavel: periodos inteiros dentro da largura */
function hillPath(seedPhase: number, amplitude: number, baseline: number, harmonics: number[]) {
  const samples = 256;
  const points: string[] = [];

  for (let index = 0; index <= samples; index += 1) {
    const t = index / samples;
    const x = t * VIEW_WIDTH;

    let height = 0;
    for (let harmonic = 0; harmonic < harmonics.length; harmonic += 1) {
      const frequency = harmonics[harmonic];
      height +=
        Math.sin(t * Math.PI * 2 * frequency + seedPhase * (harmonic + 1)) / (harmonic + 1.4);
    }

    const y = baseline - Math.max(0, height) * amplitude;
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }

  return `M -2,${baseline + 260} L ${points.join(" L ")} L ${VIEW_WIDTH + 2},${baseline + 260} Z`;
}

export function createPanoramaSvg(variant: SceneVariant = "day"): string {
  const sky = SKY_PALETTES[variant];
  const isNight = variant === "night";

  const clouds: string[] = [];

  // nuvens só aparecem em dia/manhã; noite ganha estrelas, entardecer fica limpo
  if (!isNight && variant !== "evening") {
    for (const cloud of CLOUDS) {
      const positions = [cloud.x];
      if (cloud.x < 400) positions.push(cloud.x + VIEW_WIDTH);
      if (cloud.x > VIEW_WIDTH - 400) positions.push(cloud.x - VIEW_WIDTH);

      for (const x of positions) {
        clouds.push(
          `<path d="${cloudPath(x, cloud.y, cloud.scale)}" fill="url(#cloudFill)" opacity="${cloud.opacity}"/>`,
        );
        clouds.push(
          `<ellipse cx="${x}" cy="${cloud.y - 4}" rx="${300 * cloud.scale}" ry="${16 * cloud.scale}" fill="#FFFFFF" opacity="${cloud.opacity * 0.5}"/>`,
        );
      }
    }
  }

  // estrelas aleatórias na variante noite
  const stars: string[] = [];
  if (isNight) {
    // LCG determinístico para posições estáveis
    let rng = 0xdeadbeef;
    const rand = () => {
      rng = (Math.imul(1664525, rng) + 1013904223) | 0;
      return (rng >>> 0) / 4294967296;
    };
    for (let i = 0; i < 280; i++) {
      const sx = rand() * VIEW_WIDTH;
      const sy = rand() * (HORIZON - 40);
      const sr = 1.2 + rand() * 2.8;
      const op = 0.4 + rand() * 0.6;
      stars.push(`<circle cx="${sx.toFixed(0)}" cy="${sy.toFixed(0)}" r="${sr.toFixed(1)}" fill="#FFFFFF" opacity="${op.toFixed(2)}"/>`);
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${VIEW_WIDTH}" height="${VIEW_HEIGHT}" viewBox="0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${sky.top}"/>
      <stop offset="0.32" stop-color="${sky.mid}"/>
      <stop offset="0.72" stop-color="${sky.low}"/>
      <stop offset="1" stop-color="${sky.horizon}"/>
    </linearGradient>

    <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${isNight ? "#1A2818" : "#DCEBC8"}"/>
      <stop offset="0.035" stop-color="${isNight ? "#1E3018" : GRASS_FAR_COLOR}"/>
      <stop offset="0.16" stop-color="${isNight ? "#1C2C14" : "#6FAE44"}"/>
      <stop offset="0.45" stop-color="${isNight ? "#162210" : "#4C8C31"}"/>
      <stop offset="1" stop-color="${isNight ? "#0E1A0C" : GRASS_NEAR_COLOR}"/>
    </linearGradient>

    <radialGradient id="cloudFill" cx="0.5" cy="0.75" r="0.75">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="0.65" stop-color="#FFFFFF"/>
      <stop offset="1" stop-color="#EAF4FC"/>
    </radialGradient>

    <linearGradient id="haze" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${sky.horizon}" stop-opacity="0"/>
      <stop offset="0.68" stop-color="${sky.horizon}" stop-opacity="0.48"/>
      <stop offset="1" stop-color="${sky.horizon}" stop-opacity="0.86"/>
    </linearGradient>

    <linearGradient id="groundHaze" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${sky.horizon}" stop-opacity="0.85"/>
      <stop offset="1" stop-color="${sky.horizon}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect x="0" y="0" width="${VIEW_WIDTH}" height="${HORIZON + 2}" fill="url(#sky)"/>
  <rect x="0" y="${HORIZON}" width="${VIEW_WIDTH}" height="${HORIZON}" fill="url(#ground)"/>

  ${stars.length > 0 ? `<g>${stars.join("")}</g>` : ""}

  <path d="${hillPath(0.7, 34, HORIZON + 2, [3, 7, 13])}" fill="${isNight ? "#162812" : "#8FB878"}" opacity="0.62"/>
  <path d="${hillPath(2.3, 23, HORIZON + 9, [5, 11, 19])}" fill="${isNight ? "#122010" : "#639C4C"}" opacity="0.8"/>
  <path d="${hillPath(4.1, 14, HORIZON + 17, [2, 9, 17])}" fill="${isNight ? "#0E1A0C" : "#4E8C39"}" opacity="0.92"/>

  <rect x="0" y="${HORIZON - 60}" width="${VIEW_WIDTH}" height="62" fill="url(#haze)"/>
  <rect x="0" y="${HORIZON}" width="${VIEW_WIDTH}" height="90" fill="url(#groundHaze)"/>

  <g>${clouds.join("")}</g>
</svg>`;
}

/**
 * Rasteriza o SVG e devolve a textura pronta para `scene.background`.
 * Resolucao menor nos perfis leves: a imagem e so gradiente, quase nao perde.
 */
export function loadPanoramaTexture(resolution: 1024 | 2048, variant: SceneVariant = "day"): Promise<THREE.Texture> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = "async";
    image.width = resolution * 2;
    image.height = resolution;

    image.onload = () => {
      const texture = new THREE.Texture(image);
      texture.mapping = THREE.EquirectangularReflectionMapping;
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.wrapS = THREE.RepeatWrapping;
      texture.generateMipmaps = true;
      texture.needsUpdate = true;
      resolve(texture);
    };

    image.onerror = () => reject(new Error("Nao foi possivel gerar o panorama"));

    const svg = createPanoramaSvg(variant)
      .replace(`width="${VIEW_WIDTH}"`, `width="${resolution * 2}"`)
      .replace(`height="${VIEW_HEIGHT}"`, `height="${resolution}"`);

    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}
