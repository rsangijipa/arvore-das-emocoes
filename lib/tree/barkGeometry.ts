import * as THREE from "three";

import { radiusAtParam, type BranchSegment } from "@/lib/tree/generateTree";

/**
 * Constroi a madeira da arvore (tronco + galhos + sapopemas) como UMA unica
 * geometria mesclada com cores por vertice.
 *
 * Detalhes que fazem diferenca visual:
 * - Frames de Frenet para tubos afilados, sem torcao artificial.
 * - Sapopemas/lobos na base do tronco (raiz alargada), nao um cilindro reto.
 * - Sulcos de casca deslocando os vertices no tronco e nos galhos grossos.
 * - Tampa na base do tronco e nas raizes para nao aparecer tubo oco.
 */

const WOOD_DEEP = new THREE.Color("#3B2418");
const WOOD_MID = new THREE.Color("#6A4630");
const WOOD_LIGHT = new THREE.Color("#9C7551");
const WOOD_YOUNG = new THREE.Color("#7C7248");
const MOSS = new THREE.Color("#42502C");
const LICHEN = new THREE.Color("#A8B08A");
const BARK_CRACK = new THREE.Color("#241209");

export type BarkQuality = {
  /** multiplicador de tesselacao (0.55 - 1) */
  detail: number;
};

/** hash 1D estavel para manchas de liquen e parasitas de casca */
function hash1(n: number) {
  const s = Math.sin(n * 127.1) * 43758.5453;
  return s - Math.floor(s);
}

/**
 * Sulcos de casca em multiplas oitavas (fBm analitico).
 * O tronco ganha estrias verticais profundas; galhos grossos herdam
 * uma versao comprimida das mesmas estrias, e os finos quase nada.
 */
function barkNoise(theta: number, t: number, scale: number) {
  return (
    Math.sin(theta * scale + t * 9.5) * 0.5 +
    Math.sin(theta * scale * 2.17 - t * 17.3) * 0.3 +
    Math.sin(theta * scale * 4.3 + t * 31.1) * 0.2
  );
}

function barkNoiseDetail(theta: number, t: number, scale: number) {
  return (
    barkNoise(theta, t, scale) * 0.72 +
    Math.sin(theta * scale * 8.7 - t * 52.3) * 0.18 +
    Math.sin(theta * scale * 17.3 + t * 97.7) * 0.1
  );
}

type TubeResult = {
  positions: number[];
  normals: number[];
  uvs: number[];
  colors: number[];
  indices: number[];
};

function buildTube(segment: BranchSegment, quality: BarkQuality, seedOffset: number, target: TubeResult) {
  const { curve, radiusBottom, radiusTop, depth, kind } = segment;

  const isTrunk = kind === "trunk" && depth === 0;
  const isRoot = kind === "root";
  const thick = isTrunk || isRoot || depth <= 1;

  const radialBase = isTrunk ? 16 : isRoot ? 10 : depth <= 1 ? 10 : depth <= 2 ? 8 : 5;
  const radialSegments = Math.max(4, Math.round(radialBase * quality.detail));

  const curveLength = curve.getLength();
  const tubularBase = THREE.MathUtils.clamp(Math.round(curveLength * (isTrunk ? 12 : 9)), 3, isTrunk ? 26 : 14);
  const tubularSegments = Math.max(2, Math.round(tubularBase * quality.detail));

  const frames = curve.computeFrenetFrames(tubularSegments, false);
  const vertexOffset = target.positions.length / 3;

  const point = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const color = new THREE.Color();

  // sapopemas: lobos verticais que somem subindo pelo tronco
  const lobeCount = 5;
  const lobePhase = seedOffset * 2.4;

  for (let i = 0; i <= tubularSegments; i += 1) {
    const t = i / tubularSegments;
    curve.getPointAt(t, point);

    let radius = radiusAtParam(radiusBottom, radiusTop, t);

    if (isTrunk) {
      // alargamento da base (raiz que abre para o solo)
      radius *= 1 + 0.85 * Math.pow(1 - t, 6);
    }

    const frameNormal = frames.normals[i];
    const frameBinormal = frames.binormals[i];

    for (let j = 0; j <= radialSegments; j += 1) {
      const u = j / radialSegments;
      const theta = u * Math.PI * 2;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);

      normal.set(
        frameNormal.x * cos + frameBinormal.x * sin,
        frameNormal.y * cos + frameBinormal.y * sin,
        frameNormal.z * cos + frameBinormal.z * sin,
      );

      let localRadius = radius;

      if (isTrunk) {
        // lobos das sapopemas
        const lobe = 0.5 + 0.5 * Math.cos(theta * lobeCount + lobePhase);
        localRadius *= 1 + 0.34 * lobe * Math.pow(1 - t, 4.2);
      }

      let groove = 0;
      if (thick) {
        const amplitude = (isTrunk ? 0.055 : 0.038) * radius * (1 - t * 0.5);
        const baseScale = isTrunk ? 7 : 5;
        groove =
          barkNoiseDetail(theta, t + seedOffset, baseScale) * amplitude * 0.82 +
          // fissuras finas e irregulares (quebras verticais de casca)
          hash1(Math.floor(theta * baseScale * 2.1) * 0.113 + Math.floor((t + seedOffset) * 24)) *
            amplitude *
            0.18;
        localRadius += groove;
      }

      target.positions.push(
        point.x + normal.x * localRadius,
        point.y + normal.y * localRadius,
        point.z + normal.z * localRadius,
      );
      target.normals.push(normal.x, normal.y, normal.z);
      target.uvs.push(u, t * curveLength * 1.6);

      // -------------------------------------------------------- cor
      const heightMix = THREE.MathUtils.clamp(t, 0, 1);
      if (depth <= 1) {
        color.copy(WOOD_DEEP).lerp(WOOD_MID, heightMix);
      } else {
        color.copy(WOOD_MID).lerp(WOOD_YOUNG, THREE.MathUtils.clamp((depth - 1) / 3, 0, 1));
      }

      // luz batendo nas cristas da casca, sombra nos sulcos profundos
      const grooveShade = thick ? THREE.MathUtils.clamp(groove / (radius * 0.05 + 1e-5), -1, 1) : 0;
      color.lerp(WOOD_LIGHT, Math.max(0, grooveShade) * 0.38);
      color.lerp(BARK_CRACK, Math.max(0, -grooveShade) * 0.44);

      // manchas de liquen seco nos galhos e tronco medio
      if (depth <= 2 && t > 0.25 && t < 0.85) {
        const patchNoise =
          Math.sin(theta * 4 + t * 14 + seedOffset * 3) * Math.cos(theta * 3 - t * 18);
        if (patchNoise > 0.48) {
          const lichenIntensity = (patchNoise - 0.48) * 1.8;
          color.lerp(LICHEN, Math.min(0.42, lichenIntensity));
        }
      }

      // musgo no pe da arvore e nas raizes
      const worldY = point.y;
      const mossAmount = isRoot ? 0.45 : THREE.MathUtils.clamp(1 - worldY / 0.65, 0, 1) * 0.38;
      if (mossAmount > 0) {
        color.lerp(MOSS, mossAmount * (0.45 + 0.55 * Math.max(0, normal.y)));
      }

      target.colors.push(color.r, color.g, color.b);
    }
  }

  for (let i = 0; i < tubularSegments; i += 1) {
    for (let j = 0; j < radialSegments; j += 1) {
      const a = vertexOffset + (radialSegments + 1) * i + j;
      const b = vertexOffset + (radialSegments + 1) * (i + 1) + j;
      const c = vertexOffset + (radialSegments + 1) * (i + 1) + j + 1;
      const d = vertexOffset + (radialSegments + 1) * i + j + 1;

      target.indices.push(a, b, d, b, c, d);
    }
  }

  // tampa na base do tronco / ponta enterrada das raizes
  if (isTrunk || isRoot) {
    const capT = isTrunk ? 0 : 1;
    const ringStart = vertexOffset + (isTrunk ? 0 : (radialSegments + 1) * tubularSegments);
    const center = curve.getPointAt(capT);
    const centerIndex = target.positions.length / 3;

    target.positions.push(center.x, center.y - (isTrunk ? 0.12 : 0), center.z);
    target.normals.push(0, isTrunk ? -1 : 1, 0);
    target.uvs.push(0.5, 0.5);
    target.colors.push(WOOD_DEEP.r, WOOD_DEEP.g, WOOD_DEEP.b);

    for (let j = 0; j < radialSegments; j += 1) {
      if (isTrunk) {
        target.indices.push(centerIndex, ringStart + j + 1, ringStart + j);
      } else {
        target.indices.push(centerIndex, ringStart + j, ringStart + j + 1);
      }
    }
  }
}

export function buildBarkGeometry(
  segments: BranchSegment[],
  quality: BarkQuality,
): THREE.BufferGeometry | null {
  if (segments.length === 0) {
    return null;
  }

  const target: TubeResult = { positions: [], normals: [], uvs: [], colors: [], indices: [] };

  for (let index = 0; index < segments.length; index += 1) {
    buildTube(segments[index], quality, (index % 17) * 0.37, target);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(target.positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(target.normals, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(target.uvs, 2));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(target.colors, 3));
  geometry.setIndex(target.indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();

  return geometry;
}
