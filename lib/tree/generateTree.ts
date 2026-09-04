import * as THREE from "three";

/**
 * Gerador procedural da arvore.
 *
 * Modelo botanico:
 * - Eixos recursivos com dominancia apical: cada ramo continua em si mesmo
 *   (continuacao monopodial) e emite ramos laterais ao longo do comprimento,
 *   em vez de explodir varios galhos do mesmo ponto (que gera o efeito "guarda-chuva").
 * - Filotaxia em angulo aureo (137.5 graus) para distribuir laterais e folhas.
 * - Regra dos tubos (da Vinci): o raio de um filho e sempre uma fracao do raio do
 *   pai no ponto exato de insercao -> nenhum galho fica mais grosso que quem o sustenta.
 * - Tropismos: fototropismo (subir), gravitropismo (pender nas pontas) e
 *   crescimento radial para fora do tronco (busca de luz).
 */

export type BranchKind = "trunk" | "branch" | "root";

export type BranchSegment = {
  curve: THREE.CatmullRomCurve3;
  radiusBottom: number;
  radiusTop: number;
  depth: number;
  kind: BranchKind;
  /** comprimento aproximado, usado para escolher a tesselacao */
  length: number;
};

export type LeafKind = "common" | "message";

export type LeafNode = {
  /** ponto de insercao do peciolo no galho */
  position: THREE.Vector3;
  /** eixo da lamina, da base para a ponta */
  direction: THREE.Vector3;
  /** normal da face da folha (define o roll) */
  normal: THREE.Vector3;
  scale: number;
  phase: number;
  variant: number;
  /** 0 = interior sombreado, 1 = borda da copa exposta ao sol */
  exposure: number;
  kind: LeafKind;
};

export type TreeData = {
  branches: BranchSegment[];
  roots: BranchSegment[];
  leaves: LeafNode[];
  messageLeaves: LeafNode[];
  height: number;
  crownRadius: number;
  crownCenter: THREE.Vector3;
};

export type GenerateTreeOptions = {
  seed: number;
  /** ordens de ramificacao lateral (4 = copa densa, 3 = mais leve) */
  maxOrder: number;
  trunkHeight: number;
  trunkRadius: number;
  /** quantidade alvo de folhas comuns depois da amostragem */
  leafTarget: number;
  /** quantidade de folhas com mensagem */
  messageLeafCount: number;
  /** multiplicador de folhas por raminho */
  leafDensity: number;
};

const UP = new THREE.Vector3(0, 1, 0);
const X_AXIS = new THREE.Vector3(1, 0, 0);
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

const MIN_RADIUS = 0.0045;
const MIN_LENGTH = 0.09;
const MAX_SEGMENTS = 1500;

type LevelPreset = {
  lateralsMin: number;
  lateralsMax: number;
  /** faixa do eixo pai onde os laterais nascem */
  attachFrom: number;
  attachTo: number;
  /** angulo de abertura do lateral em relacao ao pai (rad) */
  angleMin: number;
  angleMax: number;
  /** razao de comprimento lateral/pai */
  lengthRatio: number;
  /** razao raio-do-lateral / raio-do-pai-no-ponto-de-insercao */
  radiusRatio: number;
  /** afilamento do proprio eixo, do inicio ao fim */
  taper: number;
  /** comprimento da continuacao apical relativo ao eixo atual */
  continueRatio: number;
  segments: number;
  /** forca do fototropismo */
  upBias: number;
  /** peso da gravidade nas pontas */
  droop: number;
  /** afastamento do eixo vertical do tronco */
  spread: number;
  /** amplitude da sinuosidade organica */
  curveAmp: number;
};

const LEVELS: LevelPreset[] = [
  // 0 - tronco
  {
    lateralsMin: 3,
    lateralsMax: 4,
    attachFrom: 0.44,
    attachTo: 0.99,
    angleMin: 0.6,
    angleMax: 1.0,
    lengthRatio: 0.78,
    radiusRatio: 0.56,
    taper: 0.72,
    continueRatio: 0.7,
    segments: 9,
    upBias: 1.4,
    droop: 0,
    spread: 0.03,
    curveAmp: 0.05,
  },
  // 1 - galhos estruturais
  {
    lateralsMin: 2,
    lateralsMax: 4,
    attachFrom: 0.3,
    attachTo: 0.97,
    angleMin: 0.55,
    angleMax: 1.05,
    lengthRatio: 0.7,
    radiusRatio: 0.5,
    taper: 0.66,
    continueRatio: 0.76,
    segments: 7,
    upBias: 0.52,
    droop: 0.1,
    spread: 0.5,
    curveAmp: 0.1,
  },
  // 2 - galhos secundarios
  {
    lateralsMin: 2,
    lateralsMax: 3,
    attachFrom: 0.26,
    attachTo: 0.96,
    angleMin: 0.6,
    angleMax: 1.15,
    lengthRatio: 0.66,
    radiusRatio: 0.5,
    taper: 0.62,
    continueRatio: 0.74,
    segments: 6,
    upBias: 0.24,
    droop: 0.26,
    spread: 0.42,
    curveAmp: 0.15,
  },
  // 3 - ramos finos
  {
    lateralsMin: 2,
    lateralsMax: 3,
    attachFrom: 0.24,
    attachTo: 0.95,
    angleMin: 0.65,
    angleMax: 1.25,
    lengthRatio: 0.62,
    radiusRatio: 0.52,
    taper: 0.58,
    continueRatio: 0.72,
    segments: 5,
    upBias: 0.1,
    droop: 0.4,
    spread: 0.3,
    curveAmp: 0.2,
  },
  // 4+ - raminhos
  {
    lateralsMin: 1,
    lateralsMax: 3,
    attachFrom: 0.2,
    attachTo: 0.94,
    angleMin: 0.7,
    angleMax: 1.35,
    lengthRatio: 0.6,
    radiusRatio: 0.54,
    taper: 0.5,
    continueRatio: 0.7,
    segments: 4,
    upBias: 0.04,
    droop: 0.55,
    spread: 0.2,
    curveAmp: 0.26,
  },
];

function createRng(seed: number) {
  let state = (seed | 0) || 1;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) | 0;
    return (state >>> 0) / 4294967296;
  };
}

/** perfil de afilamento: base cheia, ponta fina */
export function radiusAtParam(radiusBottom: number, radiusTop: number, t: number) {
  return radiusTop + (radiusBottom - radiusTop) * Math.pow(1 - t, 1.35);
}

export function generateTree(options: GenerateTreeOptions): TreeData {
  const random = createRng(options.seed);
  const branches: BranchSegment[] = [];
  const roots: BranchSegment[] = [];
  const rawLeaves: LeafNode[] = [];

  let segmentBudget = MAX_SEGMENTS;

  const scratch = new THREE.Vector3();

  /** dois vetores perpendiculares ao tangente, formando um frame estavel */
  function perpendicularFrame(tangent: THREE.Vector3, outSide: THREE.Vector3, outUp: THREE.Vector3) {
    const reference = Math.abs(tangent.y) > 0.92 ? X_AXIS : UP;
    outSide.crossVectors(tangent, reference).normalize();
    outUp.crossVectors(tangent, outSide).normalize();
  }

  /**
   * Quem carrega folha e o raminho FINO, nao a "ordem" da recursao.
   * A continuacao apical mantem a ordem do pai, entao um galho de ordem 0 pode
   * terminar fininho la no alto: se olhassemos so a ordem, ele viraria uma vara
   * pelada. Aqui a densidade vem do raio.
   */
  const leafRadiusThreshold = options.trunkRadius * 0.11;

  function emitLeaves(
    curve: THREE.CatmullRomCurve3,
    axisLength: number,
    roll: number,
    radiusBottom: number,
    radiusTop: number,
  ) {
    const thinness = radiusTop / leafRadiusThreshold;
    const leafiness = THREE.MathUtils.clamp(1.7 - thinness, 0, 1);

    if (leafiness <= 0.01) {
      return;
    }

    const count = Math.max(
      0,
      Math.round(axisLength * 34 * options.leafDensity * leafiness * (0.75 + random() * 0.5)),
    );

    if (count === 0) {
      return;
    }

    const side = new THREE.Vector3();
    const upSide = new THREE.Vector3();

    for (let index = 0; index < count; index += 1) {
      // folhas se concentram na metade distal do raminho
      const t = THREE.MathUtils.clamp(
        0.26 + (index / Math.max(1, count - 1)) * 0.74 + (random() - 0.5) * 0.06,
        0,
        1,
      );
      const point = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t).normalize();

      perpendicularFrame(tangent, side, upSide);

      const phyllotaxis = roll + index * GOLDEN_ANGLE + random() * 0.2;
      const radial = side
        .clone()
        .multiplyScalar(Math.cos(phyllotaxis))
        .addScaledVector(upSide, Math.sin(phyllotaxis))
        .normalize();

      // eixo da lamina: abre em relacao ao raminho, busca luz e pende na ponta
      const openAngle = 0.8 + random() * 0.55;
      const blade = tangent
        .clone()
        .multiplyScalar(Math.cos(openAngle))
        .addScaledVector(radial, Math.sin(openAngle))
        .addScaledVector(UP, 0.3 - t * 0.4)
        .normalize();

      const attachRadius = radiusAtParam(radiusBottom, radiusTop, t);
      const position = point.clone().addScaledVector(radial, attachRadius * 0.9);

      const normal = new THREE.Vector3().crossVectors(blade, radial);
      if (normal.lengthSq() < 1e-6) {
        normal.copy(UP);
      }
      normal.normalize().applyAxisAngle(blade, (random() - 0.5) * 1.15).normalize();

      rawLeaves.push({
        position,
        direction: blade,
        normal,
        scale: 0.8 + random() * 0.45,
        phase: random() * Math.PI * 2,
        variant: random() < 0.34 ? 0 : random() < 0.72 ? 1 : 2,
        exposure: 0,
        kind: "common",
      });
    }
  }

  function growAxis(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    radius: number,
    length: number,
    order: number,
    roll: number,
    kind: BranchKind,
  ) {
    if (segmentBudget <= 0 || radius < MIN_RADIUS || length < MIN_LENGTH) {
      return;
    }

    segmentBudget -= 1;

    const level = LEVELS[Math.min(order, LEVELS.length - 1)];
    const steps = level.segments;
    const stepLength = length / steps;

    const points: THREE.Vector3[] = [origin.clone()];
    const cursor = origin.clone();
    const heading = direction.clone().normalize();
    const bend = new THREE.Vector3();

    for (let step = 1; step <= steps; step += 1) {
      const t = step / steps;

      // fototropismo: puxa para cima, mais forte na base do eixo
      heading.addScaledVector(UP, level.upBias * stepLength * (1 - t * 0.4));
      // gravitropismo: as pontas pendem
      heading.addScaledVector(UP, -level.droop * stepLength * t * t);

      // busca de luz: afasta do eixo vertical do tronco
      scratch.set(cursor.x, 0, cursor.z);
      if (scratch.lengthSq() < 1e-6) {
        scratch.set(Math.cos(roll), 0, Math.sin(roll));
      }
      scratch.normalize();
      heading.addScaledVector(scratch, level.spread * stepLength);

      // sinuosidade organica com memoria (curva suave, sem zigue-zague)
      bend.x += (random() - 0.5) * level.curveAmp * 0.6;
      bend.y += (random() - 0.5) * level.curveAmp * 0.4;
      bend.z += (random() - 0.5) * level.curveAmp * 0.6;
      bend.clampLength(0, level.curveAmp);
      heading.addScaledVector(bend, stepLength);

      heading.normalize();
      cursor.addScaledVector(heading, stepLength);
      points.push(cursor.clone());
    }

    const curve = new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.5);
    const radiusTop = Math.max(MIN_RADIUS * 0.4, radius * level.taper);

    branches.push({
      curve,
      radiusBottom: radius,
      radiusTop,
      depth: order,
      kind,
      length,
    });

    // toda secao fina ganha folhas, inclusive a ponta da continuacao apical
    emitLeaves(curve, length, roll, radius, radiusTop);

    const terminal =
      order >= options.maxOrder ||
      radiusTop < MIN_RADIUS ||
      length * level.continueRatio < MIN_LENGTH;

    if (terminal) {
      return;
    }

    // ---------------------------------------------------------- laterais
    const lateralCount =
      level.lateralsMin + Math.floor(random() * (level.lateralsMax - level.lateralsMin + 1));
    const side = new THREE.Vector3();
    const upSide = new THREE.Vector3();

    for (let index = 0; index < lateralCount; index += 1) {
      const spread = (index + 0.5 + (random() - 0.5) * 0.55) / lateralCount;
      const t = THREE.MathUtils.clamp(
        level.attachFrom + spread * (level.attachTo - level.attachFrom),
        0.05,
        0.99,
      );

      const attachPoint = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t).normalize();
      perpendicularFrame(tangent, side, upSide);

      const childRoll = roll + (index + 1) * GOLDEN_ANGLE + random() * 0.25;
      const outward = side
        .clone()
        .multiplyScalar(Math.cos(childRoll))
        .addScaledVector(upSide, Math.sin(childRoll))
        .normalize();

      const angle = level.angleMin + random() * (level.angleMax - level.angleMin);
      const childDirection = tangent
        .clone()
        .multiplyScalar(Math.cos(angle))
        .addScaledVector(outward, Math.sin(angle))
        .normalize();

      const attachRadius = radiusAtParam(radius, radiusTop, t);
      const childRadius = attachRadius * level.radiusRatio * (0.86 + random() * 0.26);

      // laterais mais baixos no eixo sao mais longos -> copa arredondada
      const childLength = length * level.lengthRatio * (0.8 + random() * 0.4) * (1.14 - t * 0.36);

      // nasce ligeiramente dentro do pai para a juncao nao ficar vazada
      const childOrigin = attachPoint.clone().addScaledVector(childDirection, -attachRadius * 0.9);

      growAxis(childOrigin, childDirection, childRadius, childLength, order + 1, childRoll, "branch");
    }

    // -------------------------------------------------- continuacao apical
    const tipPoint = curve.getPointAt(1);
    const tipTangent = curve.getTangentAt(1).normalize();

    growAxis(
      tipPoint.addScaledVector(tipTangent, -radiusTop * 0.6),
      tipTangent,
      radiusTop,
      length * level.continueRatio * (0.9 + random() * 0.2),
      order,
      roll + GOLDEN_ANGLE * 0.5,
      kind,
    );
  }

  // --------------------------------------------------------------- tronco
  const trunkLean = new THREE.Vector3((random() - 0.5) * 0.09, 1, (random() - 0.5) * 0.09).normalize();
  growAxis(
    new THREE.Vector3(0, 0, 0),
    trunkLean,
    options.trunkRadius,
    options.trunkHeight,
    0,
    random() * Math.PI * 2,
    "trunk",
  );

  // ------------------------------------------------------------ sapopemas
  const rootCount = 4 + Math.floor(random() * 3);
  const rootBaseRoll = random() * Math.PI * 2;

  for (let index = 0; index < rootCount; index += 1) {
    const angle = rootBaseRoll + (index / rootCount) * Math.PI * 2 + (random() - 0.5) * 0.42;
    const outward = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle));
    const reach = options.trunkRadius * (2.3 + random() * 1.6);

    const start = new THREE.Vector3(0, options.trunkRadius * (0.85 + random() * 0.6), 0);
    const points = [start.clone()];
    const position = start.clone();
    const heading = outward.clone().addScaledVector(UP, -0.3).normalize();

    const steps = 4;
    for (let step = 1; step <= steps; step += 1) {
      heading.addScaledVector(UP, -0.34);
      heading.x += (random() - 0.5) * 0.18;
      heading.z += (random() - 0.5) * 0.18;
      heading.normalize();
      position.addScaledVector(heading, reach / steps);
      position.y = Math.max(position.y, -0.14);
      points.push(position.clone());
    }

    roots.push({
      curve: new THREE.CatmullRomCurve3(points, false, "catmullrom", 0.6),
      radiusBottom: options.trunkRadius * (0.48 + random() * 0.18),
      radiusTop: options.trunkRadius * 0.11,
      depth: 0,
      kind: "root",
      length: reach,
    });
  }

  // ------------------------------------------------------ metricas da copa
  let maxY = options.trunkHeight;
  let crownRadius = 0.001;
  const crownCenter = new THREE.Vector3();

  for (const leaf of rawLeaves) {
    maxY = Math.max(maxY, leaf.position.y);
    crownRadius = Math.max(crownRadius, Math.hypot(leaf.position.x, leaf.position.z));
    crownCenter.add(leaf.position);
  }

  if (rawLeaves.length > 0) {
    crownCenter.divideScalar(rawLeaves.length);
  } else {
    crownCenter.set(0, options.trunkHeight, 0);
  }

  const verticalSpan = Math.max(0.6, maxY - crownCenter.y);
  for (const leaf of rawLeaves) {
    const horizontal = Math.hypot(leaf.position.x - crownCenter.x, leaf.position.z - crownCenter.z);
    const vertical = THREE.MathUtils.clamp((leaf.position.y - crownCenter.y) / verticalSpan, -1, 1);
    leaf.exposure = THREE.MathUtils.clamp(
      (horizontal / Math.max(0.4, crownRadius)) * 0.62 + (vertical * 0.5 + 0.5) * 0.38,
      0,
      1,
    );
  }

  // ------------------------------------------- selecao das folhas-mensagem
  const messageLeaves = pickMessageLeaves(rawLeaves, options.messageLeafCount, random);
  const messageSources = new Set(messageLeaves.map((leaf) => leaf.position));

  const commonPool = rawLeaves.filter((leaf) => !messageSources.has(leaf.position));
  const leaves = sampleLeaves(commonPool, options.leafTarget, random);

  return {
    branches,
    roots,
    leaves,
    messageLeaves,
    height: maxY,
    crownRadius,
    crownCenter,
  };
}

/**
 * Escolhe folhas bem espalhadas (um setor angular por folha) e preferencialmente
 * na borda ensolarada da copa, para que fiquem visiveis de qualquer angulo.
 */
function pickMessageLeaves(pool: LeafNode[], count: number, random: () => number): LeafNode[] {
  if (pool.length === 0 || count <= 0) {
    return [];
  }

  const bestBySector = new Map<number, LeafNode>();
  const bestScore = new Map<number, number>();

  for (const leaf of pool) {
    if (leaf.exposure < 0.34) {
      continue;
    }

    const angle = Math.atan2(leaf.position.z, leaf.position.x);
    const sector = Math.min(count - 1, Math.floor(((angle + Math.PI) / (Math.PI * 2)) * count));
    const score = leaf.exposure * 0.75 + leaf.position.y * 0.06 + random() * 0.22;

    if (!bestBySector.has(sector) || score > (bestScore.get(sector) as number)) {
      bestScore.set(sector, score);
      bestBySector.set(sector, leaf);
    }
  }

  const selected = [...bestBySector.values()];

  // completa com as folhas mais expostas caso algum setor esteja vazio
  if (selected.length < count) {
    const used = new Set(selected);
    const rest = pool
      .filter((leaf) => !used.has(leaf))
      .sort((a, b) => b.exposure - a.exposure)
      .slice(0, count - selected.length);
    selected.push(...rest);
  }

  return selected.slice(0, count).map((leaf) => ({
    ...leaf,
    direction: leaf.direction.clone(),
    normal: leaf.normal.clone(),
    kind: "message" as const,
    // folhas com mensagem sao visivelmente maiores
    scale: leaf.scale * 1.65,
    variant: 3,
  }));
}

/** amostragem uniforme com embaralhamento deterministico */
function sampleLeaves(pool: LeafNode[], target: number, random: () => number): LeafNode[] {
  if (pool.length <= target) {
    return pool;
  }

  const copy = pool.slice();
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    const temp = copy[index];
    copy[index] = copy[swap];
    copy[swap] = temp;
  }

  return copy.slice(0, target);
}
