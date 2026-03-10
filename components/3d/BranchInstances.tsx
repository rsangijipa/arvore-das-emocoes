"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import type { BranchCurve } from "@/lib/tree/generateTree";
import type { QualityProfile } from "@/types/performance";

type BranchInstancesProps = {
  branches: BranchCurve[];
  qualityProfile: QualityProfile;
};

export function BranchInstances({ branches, qualityProfile }: BranchInstancesProps) {
  const material = useMemo(
    () => {
      const branchMaterial = new THREE.MeshStandardMaterial({
        color: "#ffffff",
        roughness: 0.92,
        metalness: 0.0,
        vertexColors: true,
      });

      branchMaterial.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader.replace(
          "#include <begin_vertex>",
          `#include <begin_vertex>
          float noise = sin(position.y * 30.0 + position.x * 15.0) * 0.004;
          float noise2 = cos(position.y * 15.0 - position.z * 10.0) * 0.002;
          transformed += normal * (noise + noise2);`,
        );
      };

      branchMaterial.customProgramCacheKey = () => "branch-bark-procedural-v1";
      return branchMaterial;
    },
    [],
  );

  const mergedGeometry = useMemo(() => {
    const baseWood = new THREE.Color("#4D2D1D");
    const midWood = new THREE.Color("#6A3F26");
    const highlightWood = new THREE.Color("#9A6A46");

    const paintBranchGradient = (geometry: THREE.BufferGeometry, depth: number) => {
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
      const depthDarken = THREE.MathUtils.clamp(depth / 8, 0, 0.26);
      const tipGlow = depth <= 1 ? 0.12 : depth <= 3 ? 0.08 : 0.04;

      for (let index = 0; index < position.count; index += 1) {
        const y = position.getY(index);
        const t = THREE.MathUtils.clamp((y - minY) / range, 0, 1);

        if (t < 0.5) {
          color.copy(baseWood).lerp(midWood, t / 0.5);
        } else {
          color.copy(midWood).lerp(highlightWood, (t - 0.5) / 0.5);
        }

        color.lerp(baseWood, depthDarken);
        if (t > 0.68) {
          color.lerp(highlightWood, ((t - 0.68) / 0.32) * tipGlow);
        }

        colors[index * 3] = color.r;
        colors[index * 3 + 1] = color.g;
        colors[index * 3 + 2] = color.b;
      }

      geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    };

    const createTaperedTube = (
      curve: THREE.CatmullRomCurve3,
      rBottom: number,
      rTop: number,
      radSeg: number,
      tubSeg: number,
      depth: number,
    ) => {
      const geom = new THREE.TubeGeometry(curve, tubSeg, 1, radSeg, false);
      const posAttribute = geom.attributes.position;
      const vertexCount = posAttribute.count;
      const v = new THREE.Vector3();
      const cp = new THREE.Vector3();
      const dir = new THREE.Vector3();

      const barkNoise = (x: number, y: number, z: number) => {
        return (
          Math.sin(x * 18.0 + y * 2.8 + z * 11.0) * 0.5 +
          Math.sin(x * 32.0 - z * 22.0 + y * 1.7) * 0.3 +
          Math.sin((x + z) * 46.0 + y * 4.3) * 0.2
        );
      };

      for (let i = 0; i < vertexCount; i++) {
        v.fromBufferAttribute(posAttribute, i);
        const loopIndex = Math.floor(i / (radSeg + 1));
        const t = loopIndex / tubSeg;

        const shoulderT = THREE.MathUtils.clamp((t - 0.08) / 0.92, 0, 1);
        const easedTaper = Math.pow(shoulderT, 1.22);
        let targetRadius = THREE.MathUtils.lerp(rBottom, rTop, easedTaper);
        curve.getPointAt(t, cp);
        dir.copy(v).sub(cp).normalize();

        const groove = barkNoise(v.x, v.y, v.z);
        const grooveAmp = (1 - t * 0.75) * 0.013;
        const shoulderHold =
          depth <= 1
            ? (1 - THREE.MathUtils.smoothstep(t, 0.06, 0.34)) * rBottom * 0.08
            : depth <= 3
              ? (1 - THREE.MathUtils.smoothstep(t, 0.05, 0.26)) * rBottom * 0.04
              : 0;
        targetRadius += shoulderHold;

        const newRadius = targetRadius + groove * grooveAmp;
        const newV = cp.add(dir.multiplyScalar(newRadius));
        posAttribute.setXYZ(i, newV.x, newV.y, newV.z);
      }
      geom.computeVertexNormals();
      return geom;
    };

    const segFactor = qualityProfile === "safe" ? 0.62 : qualityProfile === "medium" ? 0.8 : 1;

    const geometriesToMerge = branches.map((b) => {
      const radSegBase = b.depth <= 1 ? 16 : b.depth <= 3 ? 12 : 8;
      const tubSegBase = b.depth <= 1 ? 24 : b.depth <= 3 ? 16 : 12;
      const radSeg = Math.max(6, Math.round(radSegBase * segFactor));
      const tubSeg = Math.max(8, Math.round(tubSegBase * segFactor));
      const geom = createTaperedTube(b.curve, b.radiusBottom, b.radiusTop, radSeg, tubSeg, b.depth);
      paintBranchGradient(geom, b.depth);
      return geom;
    });

    if (geometriesToMerge.length === 0) {
      return null;
    }

    const merged = mergeGeometries(geometriesToMerge, false);
    geometriesToMerge.forEach((geometry) => geometry.dispose());
    return merged;
  }, [branches, qualityProfile]);

  useEffect(() => {
    return () => {
      mergedGeometry?.dispose();
      material.dispose();
    };
  }, [material, mergedGeometry]);

  if (!mergedGeometry) {
    return null;
  }

  return (
    <mesh geometry={mergedGeometry} castShadow receiveShadow frustumCulled={false}>
      <primitive object={material} attach="material" />
    </mesh>
  );
}
