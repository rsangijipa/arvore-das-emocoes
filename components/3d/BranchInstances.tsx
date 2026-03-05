"use client";

import { useEffect, useMemo } from "react";
import * as THREE from "three";
import type { BranchCurve } from "@/lib/tree/generateTree";

type BranchInstancesProps = {
  branches: BranchCurve[];
};

export function BranchInstances({ branches }: BranchInstancesProps) {
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        roughness: 0.82,
        metalness: 0.0,
        vertexColors: true,
      }),
    [],
  );

  const branchGeometries = useMemo(() => {
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

      for (let index = 0; index < position.count; index += 1) {
        const y = position.getY(index);
        const t = THREE.MathUtils.clamp((y - minY) / range, 0, 1);

        if (t < 0.5) {
          color.copy(baseWood).lerp(midWood, t / 0.5);
        } else {
          color.copy(midWood).lerp(highlightWood, (t - 0.5) / 0.5);
        }

        color.lerp(baseWood, depthDarken);
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
        const targetRadius = THREE.MathUtils.lerp(rBottom, rTop, easedTaper);
        curve.getPointAt(t, cp);
        dir.copy(v).sub(cp).normalize();

        const groove = barkNoise(v.x, v.y, v.z);
        const grooveAmp = (1 - t * 0.75) * 0.013;
        const newRadius = targetRadius + groove * grooveAmp;
        const newV = cp.add(dir.multiplyScalar(newRadius));
        posAttribute.setXYZ(i, newV.x, newV.y, newV.z);
      }
      geom.computeVertexNormals();
      return geom;
    };

    return branches.map((b) => {
      const radSeg = b.depth <= 1 ? 24 : b.depth <= 3 ? 16 : 12;
      const tubSeg = b.depth <= 1 ? 32 : b.depth <= 3 ? 24 : 16;
      const geom = createTaperedTube(b.curve, b.radiusBottom, b.radiusTop, radSeg, tubSeg);
      paintBranchGradient(geom, b.depth);

      return {
        geom,
        depth: b.depth,
      };
    });
  }, [branches]);

  useEffect(() => {
    return () => {
      branchGeometries.forEach(({ geom }) => geom.dispose());
      material.dispose();
    };
  }, [branchGeometries, material]);

  return (
    <group>
      {branchGeometries.map((b, idx) => {
        return (
          <mesh key={`branch-${idx}`} geometry={b.geom} castShadow receiveShadow>
            <primitive object={material} attach="material" />
          </mesh>
        );
      })}
    </group>
  );
}
