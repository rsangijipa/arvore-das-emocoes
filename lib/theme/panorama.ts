import * as THREE from "three";

import type { SceneVariant } from "@/lib/theme/scene-variant";

/**
 * Panorama equirretangular 360 graus desenhado em SVG vetorial de alta definicao.
 *
 * Elementos por periodo:
 * - Manha: sol suave a leste, nevoa matinal, montanhas em degradê azul-verde, nuvens leves, bando de passaros.
 * - Dia: horizonte limpo, céu azul profundo, nuvens fofas de bom tempo, relevo verde vibrante.
 * - Tarde: pôr do sol dourado/laranja com disco solar difuso, raios de luz, nuvens alaranjadas e silhuetas quentes.
 * - Noite: lua crescente brilhante com halo translúcido, 320 estrelas de tamanhos/opacidades variadas, colinas escuras sob luz prateada.
 */

export const VIEW_WIDTH = 4096;
export const VIEW_HEIGHT = 2048;
const HORIZON = VIEW_HEIGHT / 2;

/**
 * Posicao em pixels (no espaco do SVG do panorama) do astro celeste (sol/lua)
 * desenhado para cada variante. Usada por `lib/theme/sun-direction.ts` para
 * converter a posicao visual do astro em uma direcao 3D real, garantindo que a
 * luz principal da cena venha do mesmo lugar em que o sol/lua aparece no ceu.
 *
 * "day" nao desenha um disco solar (ceu limpo), entao usamos uma posicao
 * virtual bem alta e levemente a leste, coerente com um sol a pino.
 */
export function getCelestialPixelPosition(variant: SceneVariant): { x: number; y: number } {
  switch (variant) {
    case "night":
      return { x: 920, y: 540 };
    case "evening":
      return { x: 2048, y: HORIZON - 18 };
    case "morning":
      return { x: 640, y: HORIZON - 90 };
    case "day":
    default:
      return { x: 900, y: HORIZON - 340 };
  }
}

export const HORIZON_COLOR = "#E6F2F8";
export const SKY_TOP_COLOR = "#3E92D8";
export const GRASS_NEAR_COLOR = "#2F6D25";
export const GRASS_FAR_COLOR = "#8FC05A";

/** Paletas de céu por variante */
const SKY_PALETTES: Record<SceneVariant, { top: string; mid: string; low: string; horizon: string }> = {
  morning: {
    top: "#18589E",
    mid: "#4593CE",
    low: "#A4CAE8",
    horizon: "#D6E8F4",
  },
  day: {
    top: "#2274C4",
    mid: "#398CCE",
    low: "#8EC7ED",
    horizon: HORIZON_COLOR,
  },
  evening: {
    top: "#5E2522",
    mid: "#B85420",
    low: "#E8923A",
    horizon: "#F5C878",
  },
  night: {
    top: "#040814",
    mid: "#0B1528",
    low: "#15243E",
    horizon: "#192838",
  },
};

type Cloud = {
  x: number;
  y: number;
  scale: number;
  opacity: number;
};

const CLOUDS_DAY: Cloud[] = [
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

const CLOUDS_EVENING: Cloud[] = [
  { x: 320, y: 920, scale: 0.55, opacity: 0.85 },
  { x: 920, y: 945, scale: 0.42, opacity: 0.75 },
  { x: 1600, y: 910, scale: 0.65, opacity: 0.88 },
  { x: 2200, y: 950, scale: 0.35, opacity: 0.7 },
  { x: 2900, y: 915, scale: 0.58, opacity: 0.82 },
  { x: 3600, y: 940, scale: 0.44, opacity: 0.78 },
];

/** silhueta de uma nuvem baixa: base reta, topo ondulado */
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

  return `M -2,${baseline + 280} L ${points.join(" L ")} L ${VIEW_WIDTH + 2},${baseline + 280} Z`;
}

/** silhueta de um passaro voando ao longe (arco em V) */
function birdPath(x: number, y: number, s: number) {
  return `M ${x - 14 * s} ${y + 4 * s} Q ${x - 7 * s} ${y - 6 * s} ${x} ${y} Q ${x + 7 * s} ${y - 6 * s} ${x + 14 * s} ${y + 4 * s}`;
}

/** altura da mesma curva usada em hillPath, para ancorar detalhes na crista */
function hillHeightAt(t: number, seedPhase: number, amplitude: number, harmonics: number[]) {
  let height = 0;
  for (let harmonic = 0; harmonic < harmonics.length; harmonic += 1) {
    const frequency = harmonics[harmonic];
    height += Math.sin(t * Math.PI * 2 * frequency + seedPhase * (harmonic + 1)) / (harmonic + 1.4);
  }
  return Math.max(0, height) * amplitude;
}

/** silhueta de pinheiro/arbusto minusculo, para pontuar a crista mais proxima */
function treeMarkPath(x: number, y: number, s: number) {
  const w = 9 * s;
  const h = 26 * s;
  return `M ${x} ${y - h} L ${x + w} ${y} L ${x - w} ${y} Z M ${x - 1.5 * s} ${y} L ${x + 1.5 * s} ${y} L ${x + 1.5 * s} ${y + 5 * s} L ${x - 1.5 * s} ${y + 5 * s} Z`;
}

/**
 * Linha de arvores ao longo da crista mais proxima: pontua o horizonte com
 * detalhe fino sem exigir geometria 3D real — visivel so em silhueta, entao
 * o SVG plano ja convence a essa distancia.
 */
function treelineSvg(seedPhase: number, amplitude: number, baseline: number, harmonics: number[], color: string) {
  const marks: string[] = [];
  let rng = Math.floor((seedPhase + 7) * 104729) >>> 0;
  const rand = () => {
    rng = (Math.imul(1664525, rng) + 1013904223) | 0;
    return (rng >>> 0) / 4294967296;
  };

  const step = VIEW_WIDTH / 340;
  for (let x = 0; x < VIEW_WIDTH; x += step) {
    if (rand() > 0.6) continue;
    const t = x / VIEW_WIDTH;
    const y = baseline - hillHeightAt(t, seedPhase, amplitude, harmonics);
    const scale = 0.55 + rand() * 0.85;
    marks.push(`<path d="${treeMarkPath(x + (rand() - 0.5) * step * 0.6, y + 2, scale)}" fill="${color}"/>`);
  }

  return `<g opacity="0.82">${marks.join("")}</g>`;
}

export function createPanoramaSvg(variant: SceneVariant = "day"): string {
  const sky = SKY_PALETTES[variant];
  const isNight = variant === "night";
  const isEvening = variant === "evening";
  const isMorning = variant === "morning";

  const clouds: string[] = [];
  const cloudList = isEvening ? CLOUDS_EVENING : CLOUDS_DAY;

  if (!isNight) {
    const cloudFill = isEvening ? "url(#cloudFillEvening)" : "url(#cloudFill)";
    for (const cloud of cloudList) {
      const positions = [cloud.x];
      if (cloud.x < 400) positions.push(cloud.x + VIEW_WIDTH);
      if (cloud.x > VIEW_WIDTH - 400) positions.push(cloud.x - VIEW_WIDTH);

      for (const x of positions) {
        clouds.push(
          `<path d="${cloudPath(x, cloud.y, cloud.scale)}" fill="${cloudFill}" opacity="${cloud.opacity}"/>`,
        );
        clouds.push(
          `<ellipse cx="${x}" cy="${cloud.y - 4}" rx="${300 * cloud.scale}" ry="${16 * cloud.scale}" fill="${isEvening ? "#FFE3B0" : "#FFFFFF"}" opacity="${cloud.opacity * 0.45}"/>`,
        );
      }
    }
  }

  // estrelas na noite: 340 estrelas deterministas
  const stars: string[] = [];
  if (isNight) {
    let rng = 0xdeadbeef;
    const rand = () => {
      rng = (Math.imul(1664525, rng) + 1013904223) | 0;
      return (rng >>> 0) / 4294967296;
    };
    for (let i = 0; i < 340; i++) {
      const sx = rand() * VIEW_WIDTH;
      const sy = rand() * (HORIZON - 35);
      const sr = 1.0 + rand() * 2.6;
      const op = 0.35 + rand() * 0.65;
      stars.push(`<circle cx="${sx.toFixed(0)}" cy="${sy.toFixed(0)}" r="${sr.toFixed(1)}" fill="#FFFFFF" opacity="${op.toFixed(2)}"/>`);
    }
  }

  // passaros voando ao longe (manha/dia)
  const birds: string[] = [];
  if (isMorning || variant === "day") {
    const birdCoords = [
      { x: 1480, y: 780, s: 0.8 },
      { x: 1520, y: 765, s: 0.7 },
      { x: 1560, y: 790, s: 0.65 },
      { x: 1610, y: 810, s: 0.55 },
      { x: 3100, y: 820, s: 0.75 },
      { x: 3140, y: 805, s: 0.6 },
    ];
    for (const b of birdCoords) {
      birds.push(
        `<path d="${birdPath(b.x, b.y, b.s)}" fill="none" stroke="${isMorning ? "#2A4560" : "#2E4F70"}" stroke-width="${1.6 * b.s}" stroke-linecap="round" opacity="0.55"/>`,
      );
    }
  }

  // astros celestes (sol ou lua no fundo)
  let celestialBody = "";
  if (isNight) {
    // lua crescente prateada com halo suave
    const lx = 920;
    const ly = 540;
    celestialBody = `
      <circle cx="${lx}" cy="${ly}" r="140" fill="url(#moonGlow)" />
      <!-- lua crescente usando mascara -->
      <mask id="moonMask">
        <rect x="0" y="0" width="${VIEW_WIDTH}" height="${VIEW_HEIGHT}" fill="#FFFFFF"/>
        <circle cx="${lx + 18}" cy="${ly - 10}" r="40" fill="#000000"/>
      </mask>
      <circle cx="${lx}" cy="${ly}" r="42" fill="#FFF8E7" mask="url(#moonMask)" opacity="0.95"/>
    `;
  } else if (isEvening) {
    // sol dourado do entardecer se pondo no horizonte
    const sx = 2048;
    const sy = HORIZON - 18;
    celestialBody = `
      <circle cx="${sx}" cy="${sy}" r="380" fill="url(#sunSunsetGlow)" />
      <circle cx="${sx}" cy="${sy}" r="55" fill="#FFF5D6" opacity="0.92" />
    `;
  } else if (isMorning) {
    // sol nascente suave
    const sx = 640;
    const sy = HORIZON - 90;
    celestialBody = `
      <circle cx="${sx}" cy="${sy}" r="320" fill="url(#sunMorningGlow)" />
      <circle cx="${sx}" cy="${sy}" r="48" fill="#FFFBF0" opacity="0.9" />
    `;
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
      <stop offset="0" stop-color="${isNight ? "#142214" : isEvening ? "#543C1E" : "#D4E8C2"}"/>
      <stop offset="0.035" stop-color="${isNight ? "#182C14" : isEvening ? "#5E4624" : GRASS_FAR_COLOR}"/>
      <stop offset="0.16" stop-color="${isNight ? "#172A12" : isEvening ? "#48361A" : "#6EAE44"}"/>
      <stop offset="0.45" stop-color="${isNight ? "#13200E" : isEvening ? "#3A2A14" : "#4A8830"}"/>
      <stop offset="1" stop-color="${isNight ? "#0C160A" : isEvening ? "#2A1E0E" : GRASS_NEAR_COLOR}"/>
    </linearGradient>

    <radialGradient id="cloudFill" cx="0.5" cy="0.75" r="0.75">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="0.65" stop-color="#FFFFFF"/>
      <stop offset="1" stop-color="#EAF4FC"/>
    </radialGradient>

    <radialGradient id="cloudFillEvening" cx="0.5" cy="0.75" r="0.75">
      <stop offset="0" stop-color="#FFF3D4"/>
      <stop offset="0.55" stop-color="#F8C888"/>
      <stop offset="1" stop-color="#D97A3E"/>
    </radialGradient>

    <radialGradient id="sunSunsetGlow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#FFA844" stop-opacity="0.85"/>
      <stop offset="0.4" stop-color="#FF7B24" stop-opacity="0.42"/>
      <stop offset="1" stop-color="#FF7B24" stop-opacity="0"/>
    </radialGradient>

    <radialGradient id="sunMorningGlow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#FFEAA8" stop-opacity="0.75"/>
      <stop offset="0.45" stop-color="#FFD478" stop-opacity="0.32"/>
      <stop offset="1" stop-color="#FFD478" stop-opacity="0"/>
    </radialGradient>

    <radialGradient id="moonGlow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#D8E8F8" stop-opacity="0.45"/>
      <stop offset="0.5" stop-color="#90B8E0" stop-opacity="0.15"/>
      <stop offset="1" stop-color="#90B8E0" stop-opacity="0"/>
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
  ${celestialBody}

  <!-- montanhas distantes (4 camadas com profundidade atmosferica) -->
  <path d="${hillPath(0.7, 44, HORIZON + 2, [3, 7, 13])}" fill="${isNight ? "#142410" : isEvening ? "#5C3E20" : "#8AB474"}" opacity="0.6"/>
  <path d="${hillPath(2.3, 30, HORIZON + 10, [5, 11, 19])}" fill="${isNight ? "#101D0E" : isEvening ? "#4C3218" : "#60964A"}" opacity="0.78"/>
  <path d="${hillPath(4.1, 18, HORIZON + 20, [2, 9, 17])}" fill="${isNight ? "#0C180B" : isEvening ? "#3E2812" : "#4C8836"}" opacity="0.92"/>

  <!-- crista mais proxima: contorno de luz rasante + linha de arvores -->
  <path d="${hillPath(5.6, 24, HORIZON + 34, [4, 8, 15])}" fill="${isNight ? "#081406" : isEvening ? "#2C1A0C" : "#3C742A"}" opacity="0.97"/>
  ${
    isEvening || isMorning
      ? `<path d="${hillPath(5.6, 24, HORIZON + 34, [4, 8, 15])
          .split(" Z")[0]
          .replace(/^M -2,\d+(\.\d+)? L /, "M ")}" fill="none" stroke="${isEvening ? "#FFB868" : "#FFE7B0"}" stroke-width="2.4" opacity="0.5"/>`
      : ""
  }
  ${treelineSvg(5.6, 24, HORIZON + 34, [4, 8, 15], isNight ? "#050D04" : isEvening ? "#1E1108" : "#254A18")}

  <!-- nevoa no horizonte para fusao suave do solo -->
  <rect x="0" y="${HORIZON - 70}" width="${VIEW_WIDTH}" height="72" fill="url(#haze)"/>
  <rect x="0" y="${HORIZON}" width="${VIEW_WIDTH}" height="110" fill="url(#groundHaze)"/>

  <g>${clouds.join("")}</g>
  ${birds.length > 0 ? `<g>${birds.join("")}</g>` : ""}
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
