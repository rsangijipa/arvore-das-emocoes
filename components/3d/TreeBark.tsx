"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";

import { buildBarkGeometry } from "@/lib/tree/barkGeometry";
import type { BranchSegment } from "@/lib/tree/generateTree";

type TreeBarkProps = {
  branches: BranchSegment[];
  roots: BranchSegment[];
  detail: number;
  castShadow: boolean;
};

/**
 * Tronco, galhos e sapopemas em UMA unica malha mesclada.
 * Antes eram dezenas de meshes separadas (e o tronco tinha uma animacao propria
 * que o descolava da copa). Uma malha so = 1 draw call e zero descolamento.
 */
export function TreeBark({ branches, roots, detail, castShadow }: TreeBarkProps) {
  const geometry = useMemo(
    () => buildBarkGeometry([...branches, ...roots], { detail }),
    [branches, detail, roots],
  );

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.94,
        metalness: 0,
        flatShading: false,
      }),
    [],
  );

  useEffect(() => {
    return () => {
      geometry?.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  if (!geometry) {
    return null;
  }

  return (
    <mesh geometry={geometry} material={material} castShadow={castShadow} receiveShadow />
  );
}
