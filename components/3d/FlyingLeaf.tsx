"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import type { LeafNode } from "@/lib/tree/generateTree";
import { createHeroLeafGeometry } from "@/lib/tree/leafGeometry";
import { createLeafMaterial, updateSunDirection, type LeafMaterialResult } from "@/lib/tree/leafMaterial";
import { SUN_POSITION } from "@/lib/theme/scene-tokens";

export type FlyingLeafPhase = "idle" | "flying" | "held" | "returning";

type FlyingLeafProps = {
  leaf: LeafNode | null;
  /** deslocamento do grupo da arvore, para converter a folha para o mundo */
  treeOffset: THREE.Vector3;
  phase: FlyingLeafPhase;
  reduceMotion: boolean;
  isMobile: boolean;
  onArrive: () => void;
  onReturned: () => void;
};

/** comprimento da geometria da folha-mensagem na copa */
const CANOPY_LEAF_LENGTH = 0.33;
/** a geometria heroi tem comprimento 1 */
const HERO_LEAF_LENGTH = 1;

const FLIGHT_DURATION = 2.05;
const FLIGHT_DURATION_MOBILE = 1.65;
const FLIGHT_DURATION_REDUCED = 0.45;
const RETURN_DURATION = 0.38;
/** tempo em que a folha 3D se dissolve para o cartao SVG assumir */
const HANDOFF_DURATION = 0.55;

function easeInOutCubic(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutBack(t: number) {
  const c1 = 1.24;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/**
 * A folha que se solta da arvore e voa ate a tela.
 *
 * Fases:
 *  - "flying"    : desprende, cai um pouco, rodopia e sobe ate a frente da camera
 *  - "held"      : fica suspensa respirando de leve enquanto a mensagem e lida
 *  - "returning" : dissolve e devolve o lugar dela na copa
 */
export function FlyingLeaf({
  leaf,
  treeOffset,
  phase,
  reduceMotion,
  isMobile,
  onArrive,
  onReturned,
}: FlyingLeafProps) {
  const { camera, size } = useThree();
  const meshRef = useRef<THREE.Mesh>(null);

  const progressRef = useRef(0);
  const returnRef = useRef(0);
  const handoffRef = useRef(0);
  const arrivedRef = useRef(false);
  const returnedRef = useRef(false);

  /**
   * Geometria e material em refs: os uniforms sao escritos todo frame e valores
   * memoizados sao tratados como imutaveis pelo React Compiler.
   */
  const [assets] = useState<{ geometry: THREE.BufferGeometry; material: LeafMaterialResult }>(() => {
    const material = createLeafMaterial({
      color: "#B9D07C",
      subsurfaceColor: "#F2E9A6",
      subsurfaceIntensity: 1.4,
      roughness: 0.5,
      vertexColors: true,
      windStrength: 0.012,
      cacheKey: "leaf-hero-v2",
      emissive: "#2C3A12",
      emissiveIntensity: 0.6,
    });

    material.material.transparent = true;
    material.uniforms.uLeafLength.value = HERO_LEAF_LENGTH;
    material.uniforms.uWindSpeed.value = 0.75;

    return { geometry: createHeroLeafGeometry(), material };
  });

  const geometry = assets.geometry;
  const leafMaterial = assets.material;

  useEffect(() => {
    return () => {
      assets.geometry.dispose();
      assets.material.material.dispose();
    };
  }, [assets]);

  // ------------------------------------------------------ estado da origem
  const origin = useMemo(() => {
    if (!leaf) {
      return null;
    }

    const position = leaf.position.clone().add(treeOffset);

    const y = leaf.direction.clone().normalize();
    const z = leaf.normal.clone();
    z.addScaledVector(y, -z.dot(y));
    if (z.lengthSq() < 1e-8) {
      z.set(0, 0, 1);
    }
    z.normalize();
    const x = new THREE.Vector3().crossVectors(y, z).normalize();

    const quaternion = new THREE.Quaternion().setFromRotationMatrix(
      new THREE.Matrix4().makeBasis(x, y, z),
    );

    return {
      position,
      quaternion,
      scale: (leaf.scale * CANOPY_LEAF_LENGTH) / HERO_LEAF_LENGTH,
      spin: (leaf.phase % 1) * 2 - 1,
    };
  }, [leaf, treeOffset]);

  useEffect(() => {
    if (phase === "flying") {
      progressRef.current = 0;
      handoffRef.current = 0;
      arrivedRef.current = false;
    }

    if (phase === "returning") {
      returnRef.current = 0;
      returnedRef.current = false;
    }
  }, [phase]);

  // -------------------------------------------------------- vetores reusados
  const scratch = useMemo(
    () => ({
      forward: new THREE.Vector3(),
      right: new THREE.Vector3(),
      up: new THREE.Vector3(),
      endPosition: new THREE.Vector3(),
      endQuaternion: new THREE.Quaternion(),
      landscape: new THREE.Quaternion(),
      tumble: new THREE.Quaternion(),
      control1: new THREE.Vector3(),
      control2: new THREE.Vector3(),
      point: new THREE.Vector3(),
      temp: new THREE.Vector3(),
    }),
    [],
  );

  useFrame((state, delta) => {
    const mesh = meshRef.current;
    if (!mesh || !origin || phase === "idle") {
      return;
    }

    const time = state.clock.elapsedTime;
    leafMaterial.uniforms.uTime.value = time;
    updateSunDirection(leafMaterial.uniforms.uSunDirView.value, SUN_POSITION, camera);

    // ---------------------------------------------- destino diante da camera
    const perspective = camera as THREE.PerspectiveCamera;
    const distance = isMobile ? 2.05 : 2.45;

    camera.getWorldDirection(scratch.forward);
    scratch.right.set(1, 0, 0).applyQuaternion(camera.quaternion).normalize();
    scratch.up.set(0, 1, 0).applyQuaternion(camera.quaternion).normalize();

    const visibleHeight = 2 * distance * Math.tan(THREE.MathUtils.degToRad(perspective.fov) * 0.5);
    const visibleWidth = visibleHeight * (size.width / Math.max(1, size.height));

    // no desktop a folha pousa deitada; no retrato ela pousa em pe, igual ao
    // cartao SVG que assume logo em seguida
    const targetSpan = isMobile ? visibleHeight * 0.9 : visibleWidth * 0.76;
    const targetScale = targetSpan / HERO_LEAF_LENGTH;

    scratch.endPosition
      .copy(camera.position)
      .addScaledVector(scratch.forward, distance)
      // a lamina cresce em +Y a partir do peciolo, entao recentraliza
      .addScaledVector(isMobile ? scratch.up : scratch.right, -targetSpan * 0.5);

    scratch.landscape.setFromAxisAngle(
      new THREE.Vector3(0, 0, 1),
      isMobile ? 0.06 : -Math.PI / 2 + 0.11,
    );
    scratch.endQuaternion.copy(camera.quaternion).multiply(scratch.landscape);

    // ------------------------------------------------------------ voo
    if (phase === "flying" || phase === "held") {
      const duration = reduceMotion
        ? FLIGHT_DURATION_REDUCED
        : isMobile
          ? FLIGHT_DURATION_MOBILE
          : FLIGHT_DURATION;

      if (phase === "flying") {
        progressRef.current = Math.min(1, progressRef.current + delta / duration);
      } else {
        progressRef.current = 1;
      }

      const t = progressRef.current;

      // curva: solta, cai um pouco para fora e depois sobe ate a camera
      scratch.control1
        .copy(origin.position)
        .addScaledVector(scratch.forward, 0.35)
        .add(scratch.temp.set(0, -0.55 - origin.spin * 0.12, 0))
        .addScaledVector(scratch.right, origin.spin * 0.5);

      scratch.control2
        .copy(scratch.endPosition)
        .add(scratch.temp.set(0, -0.5, 0))
        .addScaledVector(scratch.right, -origin.spin * 0.35);

      const eased = easeInOutCubic(t);
      const inv = 1 - eased;

      scratch.point
        .copy(origin.position)
        .multiplyScalar(inv * inv * inv)
        .addScaledVector(scratch.control1, 3 * inv * inv * eased)
        .addScaledVector(scratch.control2, 3 * inv * eased * eased)
        .addScaledVector(scratch.endPosition, eased * eased * eased);

      // respiracao quando ja chegou
      if (phase === "held" && !reduceMotion) {
        scratch.point.addScaledVector(scratch.up, Math.sin(time * 0.85) * 0.022);
        scratch.point.addScaledVector(scratch.right, Math.sin(time * 0.6 + 1.2) * 0.014);
      }

      mesh.position.copy(scratch.point);

      // rotacao: rodopio que desacelera ate ficar de frente para a tela
      const rotationT = easeOutCubic(Math.min(1, t * 1.08));
      mesh.quaternion.copy(origin.quaternion).slerp(scratch.endQuaternion, rotationT);

      if (!reduceMotion) {
        const tumbleDecay = Math.pow(1 - Math.min(1, t * 1.05), 1.6);
        const spinAngle = origin.spin * Math.PI * 2.1 * tumbleDecay + Math.sin(t * 9) * 0.35 * tumbleDecay;
        scratch.tumble.setFromAxisAngle(new THREE.Vector3(0, 1, 0), spinAngle);
        mesh.quaternion.multiply(scratch.tumble);

        if (phase === "held") {
          scratch.tumble.setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            Math.sin(time * 0.55) * 0.075,
          );
          mesh.quaternion.multiply(scratch.tumble);
        }
      }

      // escala com leve estouro no final
      const scaleT = reduceMotion ? easeOutCubic(t) : easeOutBack(Math.min(1, t * 1.02));
      const scale = THREE.MathUtils.lerp(origin.scale, targetScale, THREE.MathUtils.clamp(scaleT, 0, 1.06));
      mesh.scale.setScalar(scale);

      // ao pousar, a folha 3D se dissolve e o cartao SVG (alta resolucao)
      // assume o lugar dela — o texto precisa de nitidez que a malha nao da
      if (phase === "held") {
        handoffRef.current = Math.min(1, handoffRef.current + delta / HANDOFF_DURATION);
      }

      const fadeIn = THREE.MathUtils.clamp(t * 6, 0, 1);
      const fadeOut = 1 - easeOutCubic(handoffRef.current);
      leafMaterial.material.opacity = fadeIn * fadeOut;
      mesh.visible = leafMaterial.material.opacity > 0.01;

      if (phase === "flying" && t >= 1 && !arrivedRef.current) {
        arrivedRef.current = true;
        onArrive();
      }

      return;
    }

    // ------------------------------------------------------------ retorno
    if (phase === "returning") {
      returnRef.current = Math.min(1, returnRef.current + delta / RETURN_DURATION);
      const t = returnRef.current;

      // nunca aumenta a opacidade: se a folha ja tinha se dissolvido no handoff
      // para o cartao SVG, ela nao pode reaparecer aqui
      leafMaterial.material.opacity = Math.min(leafMaterial.material.opacity, 1 - easeOutCubic(t));
      mesh.visible = leafMaterial.material.opacity > 0.01;
      mesh.scale.multiplyScalar(1 - delta * 0.5);
      mesh.position.addScaledVector(scratch.up, delta * 0.22);

      if (t >= 1 && !returnedRef.current) {
        returnedRef.current = true;
        mesh.visible = false;
        onReturned();
      }
    }
  });

  if (!leaf || phase === "idle") {
    return null;
  }

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      material={leafMaterial.material}
      frustumCulled={false}
      renderOrder={10}
    />
  );
}
