import * as THREE from "three";

/**
 * Geometria de folha construida a mao (sem PlaneGeometry): silhueta ovalada com
 * ponta, peciolo, nervura central em relevo, dobra em "canoa", torcao e queda.
 *
 * O pivo fica na base do peciolo (0,0,0) e a lamina cresce em +Y, entao girar a
 * folha em torno do ponto de insercao no galho e trivial.
 */

export type LeafGeometryOptions = {
  length: number;
  width: number;
  segmentsU: number;
  segmentsV: number;
  /** dobra das bordas ao longo do eixo (canoa) */
  cup: number;
  /** relevo da nervura central */
  midrib: number;
  /** torcao ao longo do comprimento (rad) */
  twist: number;
  /** curvatura da lamina para fora do plano */
  droop: number;
  /** ondulacao da borda */
  waves: number;
  /** intensidade das nervuras gravadas nas cores por vertice */
  veinStrength?: number;
  baseColor?: THREE.ColorRepresentation;
  veinColor?: THREE.ColorRepresentation;
};

const PETIOLE = 0.12;

function halfWidthAt(v: number, width: number, waves: number) {
  if (v <= PETIOLE) {
    return width * 0.026;
  }

  const s = (v - PETIOLE) / (1 - PETIOLE);
  const body = Math.pow(Math.sin(Math.PI * Math.pow(s, 0.58)), 0.78);
  const ripple = 1 + Math.sin(s * Math.PI * 6) * waves;
  return width * 0.5 * body * ripple;
}

function veinMask(u: number, s: number) {
  const absU = Math.abs(u);
  const midrib = Math.exp(-Math.pow(absU / 0.05, 2));
  const phase = s * 9 - absU * 2.2;
  const lateral =
    Math.pow(Math.max(0, Math.cos(phase * Math.PI)), 24) * (1 - absU) * Math.sin(Math.PI * s);

  return Math.min(1, midrib + lateral * 0.9);
}

export function createLeafGeometry(options: LeafGeometryOptions): THREE.BufferGeometry {
  const {
    length,
    width,
    segmentsU,
    segmentsV,
    cup,
    midrib,
    twist,
    droop,
    waves,
    veinStrength = 0.2,
    baseColor = "#ffffff",
    veinColor = "#20301a",
  } = options;

  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const base = new THREE.Color(baseColor);
  const vein = new THREE.Color(veinColor);
  const color = new THREE.Color();

  for (let j = 0; j <= segmentsV; j += 1) {
    const v = j / segmentsV;
    const halfWidth = halfWidthAt(v, width, waves);
    const s = THREE.MathUtils.clamp((v - PETIOLE) / (1 - PETIOLE), 0, 1);

    for (let i = 0; i <= segmentsU; i += 1) {
      const u = (i / segmentsU) * 2 - 1;
      const absU = Math.abs(u);

      let x = u * halfWidth;
      const y = v * length;

      // dobra em canoa + nervura central em relevo + queda da lamina
      const fold = -cup * Math.pow(absU, 1.7) * Math.sin(Math.PI * Math.max(s, 0.001));
      const ridge = midrib * Math.pow(1 - absU, 3) * Math.sin(Math.PI * Math.max(s, 0.001));
      const bend = droop * Math.pow(s, 2.2);

      let z = fold + ridge + bend;

      // torcao ao longo do eixo Y
      const angle = twist * (s - 0.35);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const rotatedX = x * cos - z * sin;
      const rotatedZ = x * sin + z * cos;
      x = rotatedX;
      z = rotatedZ;

      positions.push(x, y, z);
      uvs.push((u + 1) * 0.5, v);

      // o atributo `color` e SEMPRE gravado: o material das folhas usa
      // vertexColors, e uma geometria sem esse atributo faz o WebGL entregar
      // (0,0,0) — a copa inteira renderiza preta.
      const mask = v <= PETIOLE ? 1 : veinMask(u, s);
      color.copy(base).lerp(vein, mask * veinStrength);
      colors.push(color.r, color.g, color.b);
    }
  }

  const stride = segmentsU + 1;
  for (let j = 0; j < segmentsV; j += 1) {
    for (let i = 0; i < segmentsU; i += 1) {
      const a = j * stride + i;
      const b = (j + 1) * stride + i;
      const c = (j + 1) * stride + i + 1;
      const d = j * stride + i + 1;

      indices.push(a, b, d, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  return geometry;
}

/**
 * Variantes usadas na copa. Indices 0-2 sao folhas comuns; o indice 3 e a folha
 * que carrega mensagem (mais larga e mais definida).
 */
export function createLeafVariants(detail: number): THREE.BufferGeometry[] {
  const segU = Math.max(3, Math.round(5 * detail));
  const segV = Math.max(4, Math.round(8 * detail));

  // TODAS as variantes gravam o atributo `color`: o material das folhas usa
  // vertexColors, e uma geometria sem esse atributo faz o WebGL entregar (0,0,0)
  // -> a copa inteira renderiza preta.
  return [
    createLeafGeometry({
      length: 0.3,
      width: 0.15,
      segmentsU: segU,
      segmentsV: segV,
      cup: 0.022,
      midrib: 0.012,
      twist: 0.35,
      droop: 0.03,
      waves: 0.03,
      veinStrength: 0.16,
    }),
    createLeafGeometry({
      length: 0.36,
      width: 0.132,
      segmentsU: segU,
      segmentsV: segV + 1,
      cup: 0.03,
      midrib: 0.011,
      twist: 0.5,
      droop: 0.045,
      waves: 0.045,
      veinStrength: 0.18,
    }),
    createLeafGeometry({
      length: 0.26,
      width: 0.168,
      segmentsU: segU + 1,
      segmentsV: segV,
      cup: 0.018,
      midrib: 0.013,
      twist: 0.22,
      droop: 0.022,
      waves: 0.055,
      veinStrength: 0.14,
    }),
    // folha-mensagem: mais tesselada porque cresce e fica em close
    createLeafGeometry({
      length: 0.33,
      width: 0.175,
      segmentsU: Math.max(5, Math.round(8 * detail)),
      segmentsV: Math.max(8, Math.round(14 * detail)),
      cup: 0.026,
      midrib: 0.016,
      twist: 0.3,
      droop: 0.035,
      waves: 0.04,
      veinStrength: 0.3,
    }),
  ];
}

/** folha em alta definicao usada na animacao de destaque */
export function createHeroLeafGeometry(): THREE.BufferGeometry {
  return createLeafGeometry({
    length: 1,
    width: 0.56,
    segmentsU: 26,
    segmentsV: 46,
    cup: 0.075,
    midrib: 0.05,
    twist: 0.16,
    droop: 0.1,
    waves: 0.022,
    veinStrength: 0.38,
    veinColor: "#1d2c17",
  });
}
