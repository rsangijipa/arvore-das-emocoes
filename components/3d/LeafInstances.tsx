"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

import type { LeafNode } from "@/lib/tree/generateTree";
import type { ThemeFilter } from "@/types/quote";

type LeafInstancesProps = {
  leaves: LeafNode[];
  quoteIds?: (string | null)[];
  quoteThemes?: (ThemeFilter | null)[];
  favoriteQuoteIds?: string[];
  activeTheme?: ThemeFilter;
  reduceMotion?: boolean;
  focusActive?: boolean;
  updateDivisor?: number;
  hoveredIndex: number | null;
  selectedIndex: number | null;
  onHover: (index: number | null) => void;
  onSelect: (index: number) => void;
};

type LeafTransform = {
  globalIndex: number;
  position: THREE.Vector3;
  baseRotation: THREE.Quaternion;
  scale: number;
  stretchX: number;
  stretchY: number;
  roll: number;
  variant: 0 | 1 | 2 | 3;
  phase: number;
  isSpecial: boolean;
};

const UP = new THREE.Vector3(0, 1, 0);

export function LeafInstances({
  leaves,
  quoteIds,
  quoteThemes,
  favoriteQuoteIds,
  activeTheme,
  reduceMotion = false,
  focusActive = false,
  updateDivisor = 1,
  hoveredIndex,
  selectedIndex,
  onHover,
  onSelect,
}: LeafInstancesProps) {
  const meshRefs = useRef<Array<THREE.InstancedMesh | null>>([]);
  const frameCounterRef = useRef(0);
  const frameStateRef = useRef({
    dummy: new THREE.Object3D(),
    windRotation: new THREE.Quaternion(),
    rollRotation: new THREE.Quaternion(),
  });

  useEffect(() => {
    if (hoveredIndex !== null) {
      document.body.style.cursor = "pointer";
      return;
    }

    document.body.style.cursor = "auto";

    return () => {
      document.body.style.cursor = "auto";
    };
  }, [hoveredIndex]);

  const leafTransforms = useMemo<LeafTransform[]>(() => {
    return leaves.map((leaf, globalIndex) => ({
      globalIndex,
      position: leaf.position.clone(),
      baseRotation: new THREE.Quaternion().setFromUnitVectors(UP, leaf.direction.clone().normalize()),
      scale: leaf.scale,
      stretchX: leaf.stretchX,
      stretchY: leaf.stretchY,
      roll: leaf.roll,
      variant: leaf.variant,
      phase: leaf.phase,
      isSpecial: leaf.isSpecial,
    }));
  }, [leaves]);

  const variantGroups = useMemo(() => {
    const groups: [LeafTransform[], LeafTransform[], LeafTransform[], LeafTransform[]] = [[], [], [], []];

    for (let index = 0; index < leafTransforms.length; index += 1) {
      const leaf = leafTransforms[index];
      groups[leaf.variant].push(leaf);
    }

    return groups;
  }, [leafTransforms]);

  const geometries = useMemo(() => {
    const createLeafGeometry = ({
      width,
      length,
      curve,
      sideBend,
      twist,
      ridge,
    }: {
      width: number;
      length: number;
      curve: number;
      sideBend: number;
      twist: number;
      ridge: number;
    }) => {
      const geometry = new THREE.PlaneGeometry(width, length, 10, 20);
      const position = geometry.attributes.position;

      for (let index = 0; index < position.count; index += 1) {
        const x = position.getX(index);
        const y = position.getY(index);
        const v = THREE.MathUtils.clamp((y + length * 0.5) / length, 0, 1);
        const u = THREE.MathUtils.clamp((x + width * 0.5) / width, 0, 1);

        const centerMask = 1 - Math.abs(u - 0.5) * 2;
        const canoe = Math.sin(v * Math.PI) * curve;
        const midRidge = Math.pow(Math.max(0, centerMask), 2.5) * ridge * (0.35 + v * 0.65);
        const asym = Math.sin(v * Math.PI * 1.7) * sideBend * (u - 0.5);

        let z = canoe + midRidge + asym;
        let px = x + Math.sin(v * Math.PI * 1.4) * sideBend * 0.4;

        const bodyWidth = Math.sin(v * Math.PI);
        const basePinch = THREE.MathUtils.smoothstep(v, 0.0, 0.16);
        const tipPinch = 1 - THREE.MathUtils.smoothstep(v, 0.8, 1.0);
        const edgeSharpness = Math.pow(bodyWidth, 0.78) * (0.32 + basePinch * 0.68) * (0.46 + tipPinch * 0.54);
        px *= edgeSharpness;

        const twistAngle = (v - 0.38) * twist;
        const cos = Math.cos(twistAngle);
        const sin = Math.sin(twistAngle);
        const rx = px * cos - z * sin;
        const rz = px * sin + z * cos;

        z = rz;
        position.setXYZ(index, rx, y, z);
      }

        geometry.computeVertexNormals();
        geometry.translate(0, -0.24, 0);
        geometry.computeBoundingBox();
        geometry.computeBoundingSphere();
        return geometry;
      };

    return [
      createLeafGeometry({ width: 0.184, length: 0.690, curve: 0.05, sideBend: 0.02, twist: 0.15, ridge: 0.014 }),
      createLeafGeometry({ width: 0.161, length: 0.828, curve: 0.06, sideBend: 0.01, twist: 0.20, ridge: 0.013 }),
      createLeafGeometry({ width: 0.218, length: 0.598, curve: 0.04, sideBend: 0.04, twist: 0.10, ridge: 0.014 }),
      createLeafGeometry({ width: 0.172, length: 0.782, curve: 0.07, sideBend: 0.03, twist: 0.35, ridge: 0.013 }),
    ] as const;
  }, []);

  const material = useMemo(() => {
    return new THREE.MeshPhysicalMaterial({
      color: "#6E8E4F",
      emissive: "#1A2514",
      emissiveIntensity: 0.15,
      roughness: 0.5,
      metalness: 0.0,
      transmission: 0.4,
      thickness: 0.05,
      side: THREE.DoubleSide,
    });
  }, []);

  const leafPalette = useMemo(
    () => ({
      hover: new THREE.Color("#DCE9AE"),
      selected: new THREE.Color("#E7BF77"),
      favorite: new THREE.Color("#D6B56B"),
      specialA: new THREE.Color("#D3B271"),
      specialB: new THREE.Color("#90B06A"),
      dark: new THREE.Color("#4E6E42"),
      medium: new THREE.Color("#6F9258"),
      dry: new THREE.Color("#8CA66B"),
      gold: new THREE.Color("#B9A16B"),
      themeBoost: new THREE.Color("#D7EEA3"),
      disabled: new THREE.Color("#465347"),
    }),
    [],
  );

  useEffect(() => {
    const color = new THREE.Color();

    for (let variantIndex = 0; variantIndex < variantGroups.length; variantIndex += 1) {
      const mesh = meshRefs.current[variantIndex];
      const variantLeaves = variantGroups[variantIndex];

      if (!mesh || variantLeaves.length === 0) {
        continue;
      }

      for (let localIndex = 0; localIndex < variantLeaves.length; localIndex += 1) {
        const leaf = variantLeaves[localIndex];
        const isHovered = hoveredIndex === leaf.globalIndex;
        const quoteId = quoteIds?.[leaf.globalIndex] ?? null;
        const isInteractive = Boolean(quoteId);
        const isFavorite = Boolean(quoteId && favoriteQuoteIds?.includes(quoteId));

        if (isHovered) {
          color.copy(leafPalette.hover);
        } else if (selectedIndex === leaf.globalIndex) {
          color.copy(leafPalette.selected);
        } else if (!isInteractive) {
          color.copy(leafPalette.disabled);
        } else if (isFavorite) {
          color.copy(leafPalette.favorite);
        } else if (leaf.isSpecial) {
          color.copy(leafPalette.specialA).lerp(leafPalette.specialB, 0.45);
        } else {
          const rand = (leaf.globalIndex % 100) / 100;
          if (rand < 0.3) {
            color.copy(leafPalette.dark);
          } else if (rand < 0.7) {
            color.copy(leafPalette.medium);
          } else if (rand < 0.92) {
            color.copy(leafPalette.dry);
          } else {
            color.copy(leafPalette.gold);
          }

          const hasThemeFocus = activeTheme && activeTheme !== "all" && quoteThemes?.[leaf.globalIndex] === activeTheme;
          if (hasThemeFocus) {
            color.lerp(leafPalette.themeBoost, 0.38);
          }
        }

        mesh.setColorAt(localIndex, color);
      }

      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
    }
  }, [activeTheme, favoriteQuoteIds, hoveredIndex, leafPalette, quoteIds, quoteThemes, selectedIndex, variantGroups]);

  useEffect(() => {
    return () => {
      geometries.forEach((geometry) => geometry.dispose());
      material.dispose();
    };
  }, [geometries, material]);

  useFrame(({ clock }) => {
    frameCounterRef.current += 1;
    const stableFocus = hoveredIndex !== null || selectedIndex !== null;
    const divisor = stableFocus ? 1 : Math.max(1, updateDivisor);
    if (divisor > 1 && frameCounterRef.current % divisor !== 0) {
      return;
    }

    const time = clock.elapsedTime;
    const { dummy, windRotation, rollRotation } = frameStateRef.current;

    for (let variantIndex = 0; variantIndex < variantGroups.length; variantIndex += 1) {
      const mesh = meshRefs.current[variantIndex];
      const variantLeaves = variantGroups[variantIndex];

      if (!mesh || variantLeaves.length === 0) {
        continue;
      }

      for (let localIndex = 0; localIndex < variantLeaves.length; localIndex += 1) {
        const leaf = variantLeaves[localIndex];
        const baseMotion = reduceMotion ? 0.42 : 1;
        const focusMotion = focusActive ? 0.86 : 1;
        const motionFactor = baseMotion * focusMotion;
        const noiseSlow = Math.sin(time * 0.38 + leaf.phase * 0.7 + leaf.position.x * 1.8) * 0.6;
        const noiseFast = Math.sin(time * 3.6 + leaf.phase * 2.1 + leaf.position.z * 4.6) * 0.4;
        const wave = (Math.sin(time * 0.8 + leaf.phase) * 0.055 + noiseSlow * 0.024) * motionFactor;
        const flutter = (Math.cos(time * 1.1 + leaf.phase) * 0.024 + noiseFast * 0.022) * motionFactor;

        windRotation.setFromEuler(new THREE.Euler(wave * 0.3, wave * 0.7, flutter * 0.25));
        rollRotation.setFromAxisAngle(UP, leaf.roll + wave * 0.16);

        const isHovered = hoveredIndex === leaf.globalIndex;
        const isSelected = selectedIndex === leaf.globalIndex;
        const quoteId = quoteIds?.[leaf.globalIndex] ?? null;
        const isInteractive = Boolean(quoteId);
        const isFavorite = Boolean(quoteId && favoriteQuoteIds?.includes(quoteId));
        const selectedOffset = selectedIndex === leaf.globalIndex ? 0.14 : 0;
        const favoriteBoost = isFavorite ? 0.03 : 0;
        const scaleFactor = isHovered ? 1.12 : 1 + selectedOffset + favoriteBoost;

        dummy.position.copy(leaf.position);
        if (isSelected) {
          const selectedSway = (reduceMotion ? 0.016 : 0.03) * (focusActive ? 0.75 : 1);
          dummy.position.y += Math.sin(time * 2) * selectedSway;
        } else if (!reduceMotion && isFavorite && !focusActive) {
          dummy.position.y += Math.sin(time * 1.4 + leaf.phase) * 0.01;
        } else if (!isInteractive) {
          dummy.position.y -= 0.015;
        }

        dummy.quaternion.copy(leaf.baseRotation).multiply(rollRotation).multiply(windRotation);
        dummy.scale.set(
          leaf.scale * leaf.stretchX * scaleFactor,
          leaf.scale * leaf.stretchY * scaleFactor,
          leaf.scale * scaleFactor,
        );
        dummy.updateMatrix();

        mesh.setMatrixAt(localIndex, dummy.matrix);

      }

      mesh.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group>
      {variantGroups.map((group, variantIndex) => (
        <instancedMesh
          key={`leaf-variant-${variantIndex}`}
          ref={(mesh) => {
            meshRefs.current[variantIndex] = mesh;
            if (mesh) {
              mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
              if (mesh.instanceColor) {
                mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
              }
            }
          }}
          args={[geometries[variantIndex], material, group.length]}
          frustumCulled={false}
          onPointerOut={() => onHover(null)}
          onPointerOver={(event) => {
            event.stopPropagation();
            if (event.instanceId === undefined) return;
            const globalIndex = group[event.instanceId]?.globalIndex;
            if (globalIndex === undefined) return;
            if (!quoteIds?.[globalIndex]) return;
            onHover(globalIndex);
          }}
          onPointerMove={(event) => {
            event.stopPropagation();
            if (event.instanceId === undefined) return;
            const globalIndex = group[event.instanceId]?.globalIndex;
            if (globalIndex === undefined) return;
            if (!quoteIds?.[globalIndex]) return;
            onHover(globalIndex);
          }}
          onClick={(event) => {
            event.stopPropagation();
            if (event.instanceId === undefined) return;
            const globalIndex = group[event.instanceId]?.globalIndex;
            if (globalIndex === undefined) return;
            if (!quoteIds?.[globalIndex]) return;
            onSelect(globalIndex);
          }}
          castShadow
          receiveShadow={false}
        />
      ))}
    </group>
  );
}
