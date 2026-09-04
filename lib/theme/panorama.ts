import * as THREE from "three";

/**
 * Panorama equirretangular 360 graus desenhado em SVG.
 *
 * A imagem e gerada por formula para ficar PERFEITAMENTE emendavel: as colinas
 * usam somas de senos cujos periodos dividem a largura, e qualquer nuvem que
 * encosta na borda e desenhada tambem do outro lado. Assim, ao girar a camera,
 * nao existe costura visivel.
 *
 * Layout (proporcao 2:1, obrigatoria em equirretangular):
 *   y = 0          -> zenite
 *   y = altura / 2 -> linha do horizonte
 *   y = altura     -> nadir
 */

const VIEW_WIDTH = 4096;
const VIEW_HEIGHT = 2048;
const HORIZON = VIEW_HEIGHT / 2;

/** cor do horizonte: usada tambem pela neblina da cena, para casar tudo */
export const HORIZON_COLOR = "#E6F2F8";
export const SKY_TOP_COLOR = "#3E92D8";
export const GRASS_NEAR_COLOR = "#2F6D25";
export const GRASS_FAR_COLOR = "#8FC05A";

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

export function createPanoramaSvg(): string {
  const clouds: string[] = [];

  for (const cloud of CLOUDS) {
    const positions = [cloud.x];
    // repete a nuvem do outro lado quando ela encosta na emenda
    if (cloud.x < 400) {
      positions.push(cloud.x + VIEW_WIDTH);
    }
    if (cloud.x > VIEW_WIDTH - 400) {
      positions.push(cloud.x - VIEW_WIDTH);
    }

    for (const x of positions) {
      clouds.push(
        `<path d="${cloudPath(x, cloud.y, cloud.scale)}" fill="url(#cloudFill)" opacity="${cloud.opacity}"/>`,
      );
      clouds.push(
        `<ellipse cx="${x}" cy="${cloud.y - 4}" rx="${300 * cloud.scale}" ry="${16 * cloud.scale}" fill="#FFFFFF" opacity="${cloud.opacity * 0.5}"/>`,
      );
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${VIEW_WIDTH}" height="${VIEW_HEIGHT}" viewBox="0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#2A7FCE"/>
      <stop offset="0.30" stop-color="${SKY_TOP_COLOR}"/>
      <stop offset="0.62" stop-color="#63AEE6"/>
      <stop offset="0.82" stop-color="#93C9EF"/>
      <stop offset="0.94" stop-color="#C9E4F5"/>
      <stop offset="1" stop-color="${HORIZON_COLOR}"/>
    </linearGradient>

    <linearGradient id="ground" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#DCEBC8"/>
      <stop offset="0.035" stop-color="${GRASS_FAR_COLOR}"/>
      <stop offset="0.16" stop-color="#6FAE44"/>
      <stop offset="0.45" stop-color="#4C8C31"/>
      <stop offset="1" stop-color="${GRASS_NEAR_COLOR}"/>
    </linearGradient>

    <radialGradient id="cloudFill" cx="0.5" cy="0.75" r="0.75">
      <stop offset="0" stop-color="#FFFFFF"/>
      <stop offset="0.65" stop-color="#FFFFFF"/>
      <stop offset="1" stop-color="#EAF4FC"/>
    </radialGradient>

    <linearGradient id="haze" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${HORIZON_COLOR}" stop-opacity="0"/>
      <stop offset="0.68" stop-color="${HORIZON_COLOR}" stop-opacity="0.48"/>
      <stop offset="1" stop-color="${HORIZON_COLOR}" stop-opacity="0.86"/>
    </linearGradient>

    <linearGradient id="groundHaze" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="${HORIZON_COLOR}" stop-opacity="0.85"/>
      <stop offset="1" stop-color="${HORIZON_COLOR}" stop-opacity="0"/>
    </linearGradient>
  </defs>

  <rect x="0" y="0" width="${VIEW_WIDTH}" height="${HORIZON + 2}" fill="url(#sky)"/>
  <rect x="0" y="${HORIZON}" width="${VIEW_WIDTH}" height="${HORIZON}" fill="url(#ground)"/>

  <!-- colinas distantes, da mais clara (longe) para a mais escura (perto) -->
  <path d="${hillPath(0.7, 34, HORIZON + 2, [3, 7, 13])}" fill="#8FB878" opacity="0.62"/>
  <path d="${hillPath(2.3, 23, HORIZON + 9, [5, 11, 19])}" fill="#639C4C" opacity="0.8"/>
  <path d="${hillPath(4.1, 14, HORIZON + 17, [2, 9, 17])}" fill="#4E8C39" opacity="0.92"/>

  <!-- neblina de distancia: dissolve as colinas no horizonte -->
  <rect x="0" y="${HORIZON - 60}" width="${VIEW_WIDTH}" height="62" fill="url(#haze)"/>
  <rect x="0" y="${HORIZON}" width="${VIEW_WIDTH}" height="90" fill="url(#groundHaze)"/>

  <!-- nuvens por ultimo: elas estao acima e a frente das colinas -->
  <g>${clouds.join("")}</g>
</svg>`;
}

/**
 * Rasteriza o SVG e devolve a textura pronta para `scene.background`.
 * Resolucao menor nos perfis leves: a imagem e so gradiente, quase nao perde.
 */
export function loadPanoramaTexture(resolution: 1024 | 2048): Promise<THREE.Texture> {
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

    const svg = createPanoramaSvg()
      .replace(`width="${VIEW_WIDTH}"`, `width="${resolution * 2}"`)
      .replace(`height="${VIEW_HEIGHT}"`, `height="${resolution}"`);

    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });
}
