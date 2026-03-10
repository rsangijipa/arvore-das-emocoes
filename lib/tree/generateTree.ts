import * as THREE from "three";

export type BranchCurve = {
  curve: THREE.CatmullRomCurve3;
  radiusBottom: number;
  radiusTop: number;
  depth: number;
};

export type RootCurve = {
  curve: THREE.CatmullRomCurve3;
  radiusBottom: number;
  radiusTop: number;
};

export type LeafNode = {
  position: THREE.Vector3;
  direction: THREE.Vector3;
  scale: number;
  phase: number;
  isSpecial: boolean;
  variant: 0 | 1 | 2 | 3;
  stretchX: number;
  stretchY: number;
  roll: number;
};

export type TreeData = {
  trunk: BranchCurve;
  roots: RootCurve[];
  branches: BranchCurve[];
  leaves: LeafNode[];
};

type GenerateTreeOptions = {
  maxDepth: number;
  baseLength: number;
  trunkHeight: number;
  initialRadius: number;
  leafDensity: number;
  leafTarget?: number;
  seed: number;
};

function rng(seed: number) {
  let value = seed;
  return () => {
    value = (Math.imul(1664525, value) + 1013904223) | 0;
    return (value >>> 0) / 4294967296;
  };
}

export function generateFractalTree(options: GenerateTreeOptions): TreeData {
  const random = rng(options.seed);
  const branches: BranchCurve[] = [];
  const zoneLeaves: Record<"A" | "B" | "C", LeafNode[]> = { A: [], B: [], C: [] };
  const roots: RootCurve[] = [];

  const up = new THREE.Vector3(0, 1, 0);
  const radial = new THREE.Vector3();
  const tangentFrame = new THREE.Quaternion();
  let highestBranchTip = new THREE.Vector3(0, options.trunkHeight, 0);

  const pushLeafCluster = (
    center: THREE.Vector3,
    branchDirection: THREE.Vector3,
    count: number,
    spread: number,
    scaleMin: number,
    scaleMax: number,
    zone: "A" | "B" | "C", // A = Tip, B = Transition, C = Interior
  ) => {
    tangentFrame.setFromUnitVectors(up, branchDirection.clone().normalize());

    for (let index = 0; index < count; index += 1) {
      const angle = random() * Math.PI * 2;

      // Spacing based on zone
      const distanceMod = zone === "C" ? 0.35 + random() * 0.65 : 0.2 + random() * 0.8;
      const distance = spread * distanceMod;

      radial.set(Math.cos(angle) * distance, (random() - 0.45) * spread * 0.7, Math.sin(angle) * distance);
      radial.applyQuaternion(tangentFrame);

      const leafPos = center.clone().add(radial);

      const radialNormal = radial.lengthSq() > 0.0001 ? radial.clone().normalize() : branchDirection.clone();
      let leafDir: THREE.Vector3;

      if (zone === "A" || zone === "B") {
        const canopyLift = zone === "A" ? 0.22 : 0.16;
        leafDir = radialNormal
          .multiplyScalar(zone === "A" ? 0.84 : 0.76)
          .add(branchDirection.clone().multiplyScalar(0.6))
          .add(up.clone().multiplyScalar(canopyLift))
          .normalize();

        if (leafDir.y < 0.08) {
          leafDir.y = 0.08 + random() * 0.12;
          leafDir.normalize();
        }
      } else {
        const pointUp = random() < 0.24;
        if (pointUp) {
          leafDir = branchDirection.clone().lerp(up, 0.35 + random() * 0.35).normalize();
        } else {
          const latTilt = new THREE.Vector3((random() - 0.5) * 1.2, (random() - 0.3) * 0.26, (random() - 0.5) * 1.2);
          leafDir = branchDirection.clone().lerp(up, 0.08).add(latTilt).normalize();
        }
      }

      // Zone-specific rotation bounds (X: -0.8 to 0.8, Z: -0.5 to 0.5)
      const baseStretchX = 0.82 + random() * 0.4;
      const baseStretchY = 0.82 + random() * 0.4;

      let finalScaleMin = scaleMin;
      let finalScaleMax = scaleMax;

      if (zone === "A") {
        finalScaleMin *= 0.78; finalScaleMax *= 0.9;
      } else if (zone === "B") {
        finalScaleMin *= 0.82; finalScaleMax *= 0.98;
      } else if (zone === "C") {
        finalScaleMin *= 0.88; finalScaleMax *= 1.08;
      }

      const variantRoll = random();
      // Percentages: A:35%, B:30%, C:20%, D:15%
      const variant = variantRoll < 0.35 ? 0 : variantRoll < 0.65 ? 1 : variantRoll < 0.85 ? 2 : 3;

      zoneLeaves[zone].push({
        position: leafPos,
        direction: leafDir,
        scale: (finalScaleMin + random() * (finalScaleMax - finalScaleMin)) * 0.8,
        phase: random() * Math.PI * 2,
        isSpecial: random() > 0.95,
        variant,
        stretchX: baseStretchX,
        stretchY: baseStretchY,
        roll: (random() - 0.5) * 1.0, // Z tilt equivalent
      });
    }
  };

  // 1. Trunk
  const trunkPoints = [];
  const currentPos = new THREE.Vector3(0, 0, 0);
  const sway = new THREE.Vector3((random() - 0.5) * 0.06, 0, (random() - 0.5) * 0.06);
  const trunkSegments = 8;
  const trunkStep = options.trunkHeight / trunkSegments;

  for (let i = 0; i <= trunkSegments; i++) {
    const t = i / trunkSegments;
    trunkPoints.push(currentPos.clone());
    sway.x += (random() - 0.5) * 0.03;
    sway.z += (random() - 0.5) * 0.03;

    const trunkDir = new THREE.Vector3(sway.x * (0.35 + t * 0.4), 1, sway.z * (0.35 + t * 0.4)).normalize();
    currentPos.add(trunkDir.clone().multiplyScalar(trunkStep));
  }

  const trunkCurve = new THREE.CatmullRomCurve3(trunkPoints);
  trunkCurve.curveType = "catmullrom";
  trunkCurve.tension = 0.58;

  const trunkRadiusTop = options.initialRadius * 0.42;
  const trunk: BranchCurve = {
    curve: trunkCurve,
    radiusBottom: options.initialRadius,
    radiusTop: trunkRadiusTop,
    depth: 0,
  };

  // 2. Roots
  const numRoots = 3 + Math.floor(random() * 3);
  for (let i = 0; i < numRoots; i++) {
    const rootAngle = (i / numRoots) * Math.PI * 2 + (random() - 0.5) * 0.38;
    const rootDir = new THREE.Vector3(Math.cos(rootAngle), -0.35, Math.sin(rootAngle)).normalize();

    const rootPoints = [new THREE.Vector3(0, options.trunkHeight * 0.06, 0)];
    const rPos = rootPoints[0].clone();
    const rDir = rootDir.clone();
    const rSegments = 4;
    const rStep = (options.initialRadius * 1.75) / rSegments;

    for (let j = 0; j < rSegments; j++) {
      rDir.y -= 0.16;
      rDir.normalize();
      rDir.x += (random() - 0.5) * 0.18;
      rDir.z += (random() - 0.5) * 0.18;
      rDir.normalize();

      rPos.add(rDir.clone().multiplyScalar(rStep));
      if (rPos.y < -0.14) rPos.y = -0.14;
      rootPoints.push(rPos.clone());
    }

    const rootCurve = new THREE.CatmullRomCurve3(rootPoints);
    rootCurve.curveType = "catmullrom";
    rootCurve.tension = 0.7;

    roots.push({
      curve: rootCurve,
      radiusBottom: options.initialRadius * 0.42,
      radiusTop: Math.max(0.008, options.initialRadius * 0.24),
    });
  }

  // 3. Branches + layered foliage
  function grow(
    origin: THREE.Vector3,
    direction: THREE.Vector3,
    length: number,
    radiusBottom: number,
    depth: number
  ) {
    if (depth > options.maxDepth) {
      const terminalCount = Math.floor(options.leafDensity * (4.0 + random() * 2.0) * (3.2 + random() * 0.9));
      pushLeafCluster(origin, direction, terminalCount, 0.35 + random() * 0.15, 0.82, 1.22, "A");
      return;
    }

      // Branch counts: 4-6 primary, 2-4 secondary
      const childCount = depth === 0 ? 4 + Math.floor(random() * 2) : depth === 1 ? 3 + Math.floor(random() * 2) : 2 + Math.floor(random() * 2);
      const baseYaw = random() * Math.PI * 2;

    for (let child = 0; child < childCount; child += 1) {
      const bPoints = [origin.clone()];
      const cPos = origin.clone();

      const branchLength = length * (depth === 0 ? 0.82 + random() * 0.16 : 0.7 + random() * 0.18);
      const yaw = baseYaw + (child / childCount) * Math.PI * 2 + (random() - 0.5) * 0.28;
      const lateral = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));

      const outwardWeight = depth === 0 ? 1.05 : depth === 1 ? 0.86 : 0.6;
      const verticalLift = depth === 0 ? 0.4 : depth === 1 ? 0.15 : -0.12 * (depth - 1);

      const cDir = direction
        .clone()
        .multiplyScalar(0.72)
        .add(lateral.multiplyScalar(outwardWeight))
        .add(new THREE.Vector3(0, verticalLift + (random() - 0.5) * 0.08, 0))
        .normalize();

      // Curvature recommended: horiz 0.03-0.12, vert 0.02-0.09
      const bSegments = depth === 0 ? 6 : depth <= 2 ? 5 : 4;
      const bend = new THREE.Vector3((random() - 0.5) * 0.09, (random() - 0.12) * 0.06, (random() - 0.5) * 0.09);

      for (let s = 1; s <= bSegments; s++) {
        bend.x += (random() - 0.5) * 0.035;
        bend.y += (random() - 0.5) * 0.03;
        bend.z += (random() - 0.5) * 0.035;
        bend.clampLength(0, 0.16);

        cDir.add(bend).normalize();
        cPos.add(cDir.clone().multiplyScalar(branchLength / bSegments));
        bPoints.push(cPos.clone());
      }

      const bCurve = new THREE.CatmullRomCurve3(bPoints);
      bCurve.curveType = "catmullrom";
      bCurve.tension = 0.65;

      // Recommended Taper by level: 0: 1.0, 1: 0.72, 2: 0.5, 3: 0.32, 4: 0.18
      const taperLevels = [1.0, 0.65, 0.4, 0.2, 0.08, 0.02];
      const taperFactor = taperLevels[Math.min(depth + 1, taperLevels.length - 1)];
      const radiusTop = Math.max(0.008, options.initialRadius * taperFactor * (0.8 + random() * 0.4));

      branches.push({
        curve: bCurve,
        radiusBottom,
        radiusTop,
        depth,
      });

      const tipPoint = bCurve.getPointAt(0.98);
      const tipDirection = bCurve.getTangentAt(0.98).normalize();
      if (tipPoint.y > highestBranchTip.y) {
        highestBranchTip = tipPoint.clone();
      }

      if (depth >= options.maxDepth - 2 && random() > 0.06) {
        const transitionCount = Math.floor(options.leafDensity * (2.5 + random() * 1.5) * (2.1 + random() * 0.6));
        const customPoint = bCurve.getPointAt(0.65 + random() * 0.25);
        const customDir = bCurve.getTangentAt(0.7).normalize();
        pushLeafCluster(customPoint, customDir, transitionCount, 0.24 + random() * 0.11, 0.8, 1.08, "B");
      }

      if (depth >= options.maxDepth - 1) {
        const terminalCount = Math.floor(options.leafDensity * (2.0 + random() * 1.5) * (2.8 + random() * 0.8));
        pushLeafCluster(tipPoint, tipDirection, terminalCount, 0.2 + random() * 0.1, 0.78, 1.06, "A");
      }

      const childLength = branchLength * (0.7 + random() * 0.18);
      const nextOriginPoint = bCurve.getPointAt(0.8 + random() * 0.2);

      grow(nextOriginPoint, cDir, childLength, radiusTop, depth + 1);
    }
  }

  // 4. Primary canopy forks
  const primaryForkCount = 2 + Math.floor(random() * 2);
  const startRadius = options.initialRadius * 0.85;

  for (let fork = 0; fork < primaryForkCount; fork += 1) {
    const forkHeight = 0.45 + fork * 0.1 + random() * 0.1;
    const clampedForkHeight = Math.min(0.75, forkHeight);
    const startPoint = trunkCurve.getPointAt(clampedForkHeight);
    const trunkTangent = trunkCurve.getTangentAt(clampedForkHeight).normalize();
    const yaw = (fork / primaryForkCount) * Math.PI * 2 + random() * 0.5;
    const lateral = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw)).multiplyScalar(0.42 + random() * 0.18);
    const forkDirection = trunkTangent.clone().multiplyScalar(0.72).add(lateral).add(new THREE.Vector3(0, 0.28, 0)).normalize();

    grow(
      startPoint,
      forkDirection,
      options.baseLength * (0.9 + random() * 0.18),
      startRadius * (0.9 + random() * 0.12),
      0,
    );
  }

  if (random() > 0.55) {
    const lowStart = trunkCurve.getPointAt(0.2 + random() * 0.08);
    const lowDir = new THREE.Vector3((random() - 0.5) * 0.95, 0.2 + random() * 0.1, (random() - 0.5) * 0.95).normalize();
    grow(lowStart, lowDir, options.baseLength * 0.62, startRadius * 0.58, 1);
  }

  const canopyCore = highestBranchTip.clone().lerp(trunkCurve.getPointAt(0.78), 0.38);
  pushLeafCluster(
    canopyCore,
    up.clone(),
    Math.round(options.leafDensity * (12 + random() * 4)),
    0.24 + random() * 0.08,
    0.82,
    1.04,
    "C",
  );

  for (let halo = 0; halo < 3; halo += 1) {
    const haloAngle = (halo / 3) * Math.PI * 2 + random() * 0.45;
    const haloOffset = new THREE.Vector3(
      Math.cos(haloAngle) * (0.18 + random() * 0.05),
      (random() - 0.15) * 0.12,
      Math.sin(haloAngle) * (0.18 + random() * 0.05),
    );

    pushLeafCluster(
      canopyCore.clone().add(haloOffset),
      up.clone().lerp(haloOffset.clone().normalize(), 0.28).normalize(),
      Math.round(options.leafDensity * (7 + random() * 3)),
      0.18 + random() * 0.05,
      0.78,
      0.98,
      "C",
    );
  }

  const targetLeafCount = Math.max(120, options.leafTarget ?? Math.round(220 + options.leafDensity * 40));
  const zoneTargets = {
    A: Math.round(targetLeafCount * 0.56),
    B: Math.round(targetLeafCount * 0.28),
    C: Math.max(0, targetLeafCount - Math.round(targetLeafCount * 0.56) - Math.round(targetLeafCount * 0.28)),
  };

  const shuffle = <T>(input: T[]) => {
    const copy = input.slice();
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = Math.floor(random() * (i + 1));
      const current = copy[i];
      copy[i] = copy[j];
      copy[j] = current;
    }
    return copy;
  };

  const take = <T>(input: T[], count: number) => {
    if (count <= 0 || input.length === 0) {
      return [] as T[];
    }

    const available = shuffle(input);
    return available.slice(0, Math.min(count, available.length));
  };

  const composedLeaves: LeafNode[] = [];
  const taken = new Set<LeafNode>();

  for (const zone of ["A", "B", "C"] as const) {
    const selected = take(zoneLeaves[zone], zoneTargets[zone]);
    for (const leaf of selected) {
      taken.add(leaf);
      composedLeaves.push(leaf);
    }
  }

  if (composedLeaves.length < targetLeafCount) {
    const pool = [...zoneLeaves.A, ...zoneLeaves.B, ...zoneLeaves.C].filter((leaf) => !taken.has(leaf));
    const refill = take(pool, targetLeafCount - composedLeaves.length);
    composedLeaves.push(...refill);
  }

  if (composedLeaves.length < targetLeafCount) {
    const fallbackPool = [...zoneLeaves.A, ...zoneLeaves.B, ...zoneLeaves.C];
    while (composedLeaves.length < targetLeafCount && fallbackPool.length > 0) {
      const source = fallbackPool[Math.floor(random() * fallbackPool.length)];
      const offset = new THREE.Vector3((random() - 0.5) * 0.03, (random() - 0.5) * 0.03, (random() - 0.5) * 0.03);
      composedLeaves.push({
        ...source,
        position: source.position.clone().add(offset),
        phase: random() * Math.PI * 2,
      });
    }
  }

  return { trunk, roots, branches, leaves: composedLeaves };
}
