"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { BranchCurve, RootCurve } from "@/lib/tree/generateTree";

type TreeTrunkProps = {
  trunk: BranchCurve;
  roots: RootCurve[];
};

function createBarkMaterial({
  roughness,
  aoDarken,
  baseDarken,
  noiseAmp,
}: {
  roughness: number;
  aoDarken: number;
  baseDarken: number;
  noiseAmp: number;
}) {
  const material = new THREE.MeshStandardMaterial({
    color: "#ffffff",
    roughness,
    metalness: 0,
    vertexColors: true,
  });

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uBarkNoiseScale = { value: 4.2 };
    shader.uniforms.uBarkNoiseAmp = { value: noiseAmp };
    shader.uniforms.uAODarken = { value: aoDarken };
    shader.uniforms.uBaseDarken = { value: baseDarken };

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uBarkNoiseScale;
        uniform float uBarkNoiseAmp;
        varying float vBarkNoise;
        varying float vWorldY;

        float hash31(vec3 p) {
          p = fract(p * 0.1031);
          p += dot(p, p.yzx + 33.33);
          return fract((p.x + p.y) * p.z);
        }

        float valueNoise(vec3 p) {
          vec3 i = floor(p);
          vec3 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);

          float n000 = hash31(i + vec3(0.0, 0.0, 0.0));
          float n100 = hash31(i + vec3(1.0, 0.0, 0.0));
          float n010 = hash31(i + vec3(0.0, 1.0, 0.0));
          float n110 = hash31(i + vec3(1.0, 1.0, 0.0));
          float n001 = hash31(i + vec3(0.0, 0.0, 1.0));
          float n101 = hash31(i + vec3(1.0, 0.0, 1.0));
          float n011 = hash31(i + vec3(0.0, 1.0, 1.0));
          float n111 = hash31(i + vec3(1.0, 1.0, 1.0));

          float nx00 = mix(n000, n100, f.x);
          float nx10 = mix(n010, n110, f.x);
          float nx01 = mix(n001, n101, f.x);
          float nx11 = mix(n011, n111, f.x);
          float nxy0 = mix(nx00, nx10, f.y);
          float nxy1 = mix(nx01, nx11, f.y);
          return mix(nxy0, nxy1, f.z);
        }

        float fbm(vec3 p) {
          float sum = 0.0;
          float amp = 0.5;
          for (int i = 0; i < 4; i++) {
            sum += valueNoise(p) * amp;
            p *= 2.03;
            amp *= 0.5;
          }
          return sum;
        }`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        float barkNoise = fbm(position * uBarkNoiseScale + vec3(0.0, position.y * 0.65, 0.0));
        float barkMask = smoothstep(-0.18, 3.2, position.y);
        transformed += normal * ((barkNoise - 0.52) * uBarkNoiseAmp * barkMask);
        vBarkNoise = barkNoise;`,
      )
      .replace(
        "#include <worldpos_vertex>",
        `#include <worldpos_vertex>
        vWorldY = worldPosition.y;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uAODarken;
        uniform float uBaseDarken;
        varying float vBarkNoise;
        varying float vWorldY;`,
      )
      .replace(
        "#include <output_fragment>",
        `float aoApprox = clamp(1.0 - uAODarken + (vBarkNoise - 0.5) * 0.12, 0.55, 1.0);
        outgoingLight *= aoApprox;

        float rootBlend = smoothstep(0.35, -0.15, vWorldY) * uBaseDarken;
        vec3 soilTint = vec3(0.23, 0.2, 0.16);
        outgoingLight = mix(outgoingLight, outgoingLight * soilTint * 1.2, rootBlend);

        #include <output_fragment>`,
      );
  };

  material.customProgramCacheKey = () => `bark-${roughness}-${aoDarken}-${baseDarken}-${noiseAmp}`;
  return material;
}

export function TreeTrunk({ trunk, roots }: TreeTrunkProps) {
  const groupRef = useRef<THREE.Group>(null);
  const trunkMaterial = useMemo(
    () => createBarkMaterial({ roughness: 0.84, aoDarken: 0.08, baseDarken: 0.52, noiseAmp: 0.034 }),
    [],
  );
  const rootMaterial = useMemo(
    () => createBarkMaterial({ roughness: 0.89, aoDarken: 0.14, baseDarken: 0.62, noiseAmp: 0.026 }),
    [],
  );

  const geometries = useMemo(() => {
    const baseWood = new THREE.Color("#4D2D1D");
    const midWood = new THREE.Color("#6A3F26");
    const highlightWood = new THREE.Color("#9A6A46");

    const paintWoodGradient = (geometry: THREE.BufferGeometry, rootBias: number) => {
      geometry.computeBoundingBox();
      const bounds = geometry.boundingBox;
      if (!bounds) {
        return;
      }

      const position = geometry.attributes.position;
      const colors = new Float32Array(position.count * 3);
      const color = new THREE.Color();
      const minY = bounds.min.y;
      const maxY = bounds.max.y;
      const range = Math.max(0.0001, maxY - minY);

      for (let index = 0; index < position.count; index += 1) {
        const y = position.getY(index);
        const t = THREE.MathUtils.clamp((y - minY) / range, 0, 1);

        if (t < 0.55) {
          color.copy(baseWood).lerp(midWood, t / 0.55);
        } else {
          color.copy(midWood).lerp(highlightWood, (t - 0.55) / 0.45);
        }

        color.lerp(baseWood, rootBias);
        colors[index * 3] = color.r;
        colors[index * 3 + 1] = color.g;
        colors[index * 3 + 2] = color.b;
      }

      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    };

    const createTaperedTube = (curve: THREE.CatmullRomCurve3, rBottom: number, rTop: number, radSeg: number, tubSeg: number) => {
      const geom = new THREE.TubeGeometry(curve, tubSeg, 1, radSeg, false);
      const posAttribute = geom.attributes.position;
      const vertexCount = posAttribute.count;
      const v = new THREE.Vector3();
      const cp = new THREE.Vector3();
      const dir = new THREE.Vector3();

      for (let i = 0; i < vertexCount; i++) {
        v.fromBufferAttribute(posAttribute, i);
        const loopIndex = Math.floor(i / (radSeg + 1));
        const t = loopIndex / tubSeg;

        const easedTaper = Math.pow(t, 1.22);
        const targetRadius = THREE.MathUtils.lerp(rBottom, rTop, easedTaper);
        curve.getPointAt(t, cp);
        dir.copy(v).sub(cp).normalize();

        const newV = cp.add(dir.multiplyScalar(targetRadius));
        posAttribute.setXYZ(i, newV.x, newV.y, newV.z);
      }
      geom.computeVertexNormals();

      return geom;
    };

    const trunkGeom = createTaperedTube(trunk.curve, trunk.radiusBottom, trunk.radiusTop, 32, 42);
    paintWoodGradient(trunkGeom, 0.0);

    const rootGeoms = roots.map((root) => {
      const geometry = createTaperedTube(root.curve, root.radiusBottom, root.radiusTop, 16, 22);
      paintWoodGradient(geometry, 0.22);
      return geometry;
    });

    return { trunkGeom, rootGeoms };
  }, [trunk, roots]);

  useEffect(() => {
    return () => {
      geometries.trunkGeom.dispose();
      geometries.rootGeoms.forEach((geometry) => geometry.dispose());
      trunkMaterial.dispose();
      rootMaterial.dispose();
    };
  }, [geometries, rootMaterial, trunkMaterial]);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.z = Math.sin(clock.elapsedTime * 0.1) * 0.005;
    groupRef.current.rotation.x = Math.cos(clock.elapsedTime * 0.08) * 0.003;
  });

  return (
    <group ref={groupRef}>
      <mesh geometry={geometries.trunkGeom} castShadow receiveShadow frustumCulled={false}>
        <primitive object={trunkMaterial} attach="material" />
      </mesh>

      {geometries.rootGeoms.map((geom, idx) => (
        <mesh key={`root-${idx}`} geometry={geom} castShadow receiveShadow frustumCulled={false}>
          <primitive object={rootMaterial} attach="material" />
        </mesh>
      ))}
    </group>
  );
}
