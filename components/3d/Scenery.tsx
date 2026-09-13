"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import { buildBushGeometry, buildRockGeometry } from "@/lib/environment/sceneryGeometry";

/**
 * Pedras e arbustos espalhados ao redor da arvore, fora do disco de grama
 * proximo ao tronco. Poucas geometrias unicas (variantes), muitas instancias:
 * o mesmo padrao de custo do GrassField/Foliage.
 */

export type SceneryProps = {
  rockCount: number;
  bushCount: number;
  seed: number;
  crownRadius: number;
  castShadow: boolean;
  receiveShadow: boolean;
};

const FIELD_INNER = 3.4;
const FIELD_OUTER = 11.5;

function createRandom(seed: number) {
  let state = (seed | 0) || 1;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) | 0;
    return (state >>> 0) / 4294967296;
  };
}

function scatterPositions(
  count: number,
  seed: number,
  innerRadius: number,
): { x: number; z: number; scale: number; yaw: number }[] {
  const random = createRandom(seed);
  const items: { x: number; z: number; scale: number; yaw: number }[] = [];

  for (let i = 0; i < count; i += 1) {
    const r = innerRadius + Math.sqrt(random()) * (FIELD_OUTER - innerRadius);
    const angle = random() * Math.PI * 2;
    items.push({
      x: Math.cos(angle) * r,
      z: Math.sin(angle) * r,
      scale: 0.55 + random() * 1.1,
      yaw: random() * Math.PI * 2,
    });
  }

  return items;
}

function useInstancedVariants(
  count: number,
  seed: number,
  variantCount: number,
  innerRadius: number,
  buildGeometry: (seed: number) => THREE.BufferGeometry,
  baseScale: number,
  yTilt: (random: () => number) => number,
) {
  const refs = useRef<Array<THREE.InstancedMesh | null>>([]);

  const geometries = useMemo(() => {
    if (count === 0) return [];
    return Array.from({ length: variantCount }, (_, index) => buildGeometry(seed + index * 977));
  }, [buildGeometry, count, seed, variantCount]);

  const groups = useMemo(() => {
    if (count === 0) return [];
    const items = scatterPositions(count, seed ^ 0x51ed2b3c, innerRadius);
    const random = createRandom(seed ^ 0x3fa1c2);
    const buckets: typeof items[] = Array.from({ length: variantCount }, () => []);
    for (const item of items) {
      buckets[Math.floor(random() * variantCount)].push(item);
    }
    return buckets;
  }, [count, innerRadius, seed, variantCount]);

  useEffect(() => {
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const random = createRandom(seed ^ 0x9e3779b9);

    groups.forEach((group, variant) => {
      const mesh = refs.current[variant];
      if (!mesh) return;

      for (let i = 0; i < group.length; i += 1) {
        const item = group[i];
        euler.set(yTilt(random), item.yaw, yTilt(random));
        quaternion.setFromEuler(euler);
        position.set(item.x, 0, item.z);
        scale.setScalar(item.scale * baseScale);
        matrix.compose(position, quaternion, scale);
        mesh.setMatrixAt(i, matrix);
      }

      mesh.count = group.length;
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups]);

  useEffect(() => {
    return () => {
      geometries.forEach((geometry) => geometry.dispose());
    };
  }, [geometries]);

  return { refs, geometries, groups };
}

export function Scenery({ rockCount, bushCount, seed, crownRadius, castShadow, receiveShadow }: SceneryProps) {
  const innerRadius = Math.max(FIELD_INNER, crownRadius * 0.9);

  const rocks = useInstancedVariants(
    rockCount,
    seed ^ 0x1234abcd,
    3,
    innerRadius,
    buildRockGeometry,
    0.42,
    (random) => (random() - 0.5) * 0.3,
  );

  const bushes = useInstancedVariants(
    bushCount,
    seed ^ 0x4321dcba,
    3,
    innerRadius,
    buildBushGeometry,
    1,
    () => 0,
  );

  const rockMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0.02 }),
    [],
  );
  const bushMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0 }),
    [],
  );

  useEffect(() => {
    return () => {
      rockMaterial.dispose();
      bushMaterial.dispose();
    };
  }, [bushMaterial, rockMaterial]);

  return (
    <group>
      {rocks.geometries.map((geometry, variant) => (
        <instancedMesh
          key={`rock-${variant}`}
          ref={(mesh) => {
            rocks.refs.current[variant] = mesh;
            if (mesh) {
              mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
              mesh.raycast = () => null;
            }
          }}
          args={[geometry, rockMaterial, Math.max(1, rocks.groups[variant]?.length ?? 1)]}
          castShadow={castShadow}
          receiveShadow={receiveShadow}
          frustumCulled={false}
        />
      ))}

      {bushes.geometries.map((geometry, variant) => (
        <instancedMesh
          key={`bush-${variant}`}
          ref={(mesh) => {
            bushes.refs.current[variant] = mesh;
            if (mesh) {
              mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
              mesh.raycast = () => null;
            }
          }}
          args={[geometry, bushMaterial, Math.max(1, bushes.groups[variant]?.length ?? 1)]}
          castShadow={castShadow}
          receiveShadow={receiveShadow}
          frustumCulled={false}
        />
      ))}
    </group>
  );
}
