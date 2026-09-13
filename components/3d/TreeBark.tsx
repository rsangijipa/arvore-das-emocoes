"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";

import { buildBarkGeometry } from "@/lib/tree/barkGeometry";
import type { BranchSegment } from "@/lib/tree/generateTree";
import { BRANCH_SWAY_GAIN, WIND_FIELD_GLSL } from "@/lib/tree/windSway";

type TreeBarkProps = {
  branches: BranchSegment[];
  roots: BranchSegment[];
  detail: number;
  castShadow: boolean;
  windStrength: number;
  reduceMotion: boolean;
};

/**
 * Tronco, galhos e sapopemas em UMA unica malha mesclada, animada no vertex
 * shader com a mesma funcao analitica de vento que empurra as folhas.
 */
export function TreeBark({
  branches,
  roots,
  detail,
  castShadow,
  windStrength,
  reduceMotion,
}: TreeBarkProps) {
  const geometry = useMemo(
    () => buildBarkGeometry([...branches, ...roots], { detail }),
    [branches, detail, roots],
  );

  const [uniforms] = useState(() => ({
    uTime: { value: 0 },
    uSway: { value: 0 },
  }));

  const material = useMemo(() => {
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.94,
      metalness: 0,
      flatShading: false,
    });

    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);

      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
          ${WIND_FIELD_GLSL}`,
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          transformed += windField(transformed);`,
        );
    };

    mat.customProgramCacheKey = () => "tree-bark-wind-v1";
    return mat;
  }, [uniforms]);

  useEffect(() => {
    return () => {
      geometry?.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const sway = reduceMotion ? 0 : windStrength * BRANCH_SWAY_GAIN;
    uniforms.uTime.value = time;
    uniforms.uSway.value = sway;
  });

  if (!geometry) {
    return null;
  }

  return (
    <mesh geometry={geometry} material={material} castShadow={castShadow} receiveShadow />
  );
}
