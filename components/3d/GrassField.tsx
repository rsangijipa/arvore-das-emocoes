"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { WIND_FIELD_GLSL } from "@/lib/tree/windSway";

/**
 * Campo de grama instanced ao redor do pe da arvore.
 *
 * Uma unica lamina-tirinha mesclada (4 filetes, afilando ate a ponta) e
 * centenas de instancias com rotacao, inclinacao e altura proprias. O balanco
 * usa o MESMO windField da arvore no pes do pe da lamina, com peso crescente
 * ate a ponta — a grama e o chao "respiram" na mesma rajada que entorta o
 * galho, em vez de ficarem pintados e inertes.
 */

const GRASS_BASE = new THREE.Color("#1E4216");
const GRASS_TIP = new THREE.Color("#7FB244");
const GRASS_GOLD = new THREE.Color("#B49B45");
const GRASS_DEEP = new THREE.Color("#2C5A20");

function createRandom(seed: number) {
  let state = (seed | 0) || 1;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) | 0;
    return (state >>> 0) / 4294967296;
  };
}

/** lamina de capim: fita de 4 secoes, curva para tras na ponta, uv.y = altura */
function buildBladeGeometry(): THREE.BufferGeometry {
  const rows = 5;
  const heights = [0, 0.26, 0.52, 0.78, 1];
  const widths = [0.5, 0.42, 0.3, 0.17, 0];
  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const color = new THREE.Color();

  for (let r = 0; r < rows; r += 1) {
    const v = r / (rows - 1);
    const y = heights[r];
    const halfWidth = widths[r] * 0.06;
    // curvatura natural: a ponta arqueia para tras (-z) e afina
    const bend = -0.22 * Math.pow(v, 2.2);

    color.copy(GRASS_BASE).lerp(GRASS_TIP, Math.pow(v, 0.8));

    positions.push(-halfWidth, y, bend);
    positions.push(halfWidth, y, bend);
    uvs.push(0, v, 1, v);
    colors.push(color.r, color.g, color.b, color.r, color.g, color.b);
  }

  for (let r = 0; r < rows - 1; r += 1) {
    const a = r * 2;
    const b = r * 2 + 1;
    const c = (r + 1) * 2 + 1;
    const d = (r + 1) * 2;
    indices.push(a, b, d, b, c, d);
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

export type GrassFieldProps = {
  count: number;
  seed: number;
  /** forca efetiva do vento na cena (ja modulada por modo sensorial) */
  windStrength: number;
  reduceMotion: boolean;
};

const FIELD_RADIUS = 7.2;
const EXCLUDE_CENTER = 0.62;

export function GrassField({ count, seed, windStrength, reduceMotion }: GrassFieldProps) {
  const meshRef = useRef<THREE.InstancedMesh | null>(null);

  const geometry = useMemo(() => {
    if (count === 0) return null;
    const blade = buildBladeGeometry();
    const phases = new Float32Array(count);
    for (let i = 0; i < count; i += 1) {
      phases[i] = (i * 0.6180339887498949 + (seed % 1000) / 1000) * Math.PI * 2;
    }
    blade.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phases, 1));
    return blade;
  }, [count, seed]);

  /** uniforms vivem em state (mesmo padrao de Foliage): escritos a cada frame */
  const [uniforms] = useState(() => ({
    uTime: { value: 0 },
    uSway: { value: 0 },
    uWind: { value: 0 },
  }));

  const material = useMemo(() => {
    if (count === 0) return null;
    const mat = new THREE.MeshStandardMaterial({
      color: "#ffffff",
      vertexColors: true,
      side: THREE.DoubleSide,
      roughness: 0.86,
      metalness: 0,
    });

    mat.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, uniforms);

      shader.vertexShader = shader.vertexShader
        .replace(
          "#include <common>",
          `#include <common>
          uniform float uWind;
          ${WIND_FIELD_GLSL}
          #ifdef USE_INSTANCING
            attribute float aPhase;
          #endif`,
        )
        .replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          #ifdef USE_INSTANCING
            float tipFlex = uv.y * uv.y;
            vec3 grassAnchor = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
            transformed += inverse(mat3(instanceMatrix)) * (windField(grassAnchor) * (0.35 + 0.9 * tipFlex));
            transformed.x += sin(uTime * 2.3 + aPhase) * uWind * 2.4 * tipFlex;
          #endif`,
        );
    };

    mat.customProgramCacheKey = () => "grass-blade-wind-v1";
    return mat;
  }, [count, uniforms]);

  const [layouts] = useState(() => {
    if (count === 0) return null;
    const random = createRandom(seed ^ 0x7a1c2b3d);
    const items: { x: number; z: number; scale: number; tilt: number; yaw: number; gold: boolean }[] = [];

    for (let i = 0; i < count; i += 1) {
      // disco uniforme com furo no pe da arvore (terra exposta)
      let x = 0;
      let z = 0;
      for (let attempt = 0; attempt < 6; attempt += 1) {
        const r = Math.sqrt(random()) * FIELD_RADIUS;
        const a = random() * Math.PI * 2;
        x = Math.cos(a) * r;
        z = Math.sin(a) * r;
        if (Math.hypot(x, z) > EXCLUDE_CENTER) break;
      }
      const dist = Math.hypot(x, z);
      const clump = 1 + Math.sin(x * 2.7 + z * 1.9) * 0.28;
      items.push({
        x,
        z,
        scale: (0.16 + random() * 0.2) * clump * (1 + dist * 0.015),
        tilt: (random() - 0.5) * 0.5,
        yaw: random() * Math.PI * 2,
        gold: random() < 0.09,
      });
    }
    return items;
  });

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || !layouts) return;

    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const euler = new THREE.Euler();
    const position = new THREE.Vector3();
    const scale = new THREE.Vector3();
    const color = new THREE.Color();

    for (let i = 0; i < layouts.length; i += 1) {
      const item = layouts[i];
      euler.set(item.tilt, item.yaw, item.tilt * 0.4);
      quaternion.setFromEuler(euler);
      position.set(item.x, -0.01, item.z);
      scale.setScalar(item.scale);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(i, matrix);

      color
        .copy(item.gold ? GRASS_GOLD : GRASS_DEEP)
        .lerp(GRASS_TIP, ((item.yaw * 13.37) % 1) * 0.5);
      mesh.setColorAt(i, color);
    }

    mesh.count = layouts.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [layouts]);

  useEffect(() => {
    return () => {
      geometry?.dispose();
      material?.dispose();
    };
  }, [geometry, material]);

  useFrame(({ clock }) => {
    uniforms.uTime.value = clock.elapsedTime;
    uniforms.uSway.value = reduceMotion ? windStrength * 0.35 : windStrength * 3.4;
    uniforms.uWind.value = reduceMotion ? 0 : windStrength;
  });

  if (!geometry || !material || count === 0) {
    return null;
  }

  return (
    <instancedMesh
      ref={(mesh) => {
        meshRef.current = mesh;
        if (mesh) {
          mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
          mesh.raycast = () => null;
        }
      }}
      args={[geometry, material, count]}
      frustumCulled={false}
    />
  );
}
