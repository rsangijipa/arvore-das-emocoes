"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * Passaros sobrevoando a copa em loops largos e lentos.
 *
 * Cada passaro e um sprite (sempre de frente pra camera) com silhueta
 * desenhada em canvas, alternando entre dois quadros (asa aberta/fechada)
 * para simular o bater de asas sem custar geometria animada. Poucos
 * individuos, movimento simples: perto o suficiente para dar vida ao ceu
 * sem competir visualmente com a arvore.
 */

function createRandom(seed: number) {
  let state = (seed | 0) || 1;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) | 0;
    return (state >>> 0) / 4294967296;
  };
}

/** silhueta de passaro em "M": asas abertas (voo) ou recolhidas (batida) */
function createBirdTexture(wingsOpen: boolean) {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  const cx = size / 2;
  const cy = size / 2;
  const spread = wingsOpen ? 0.42 : 0.22;
  const lift = wingsOpen ? 0.06 : 0.16;

  context.strokeStyle = "rgba(30,26,20,0.88)";
  context.lineWidth = size * 0.075;
  context.lineCap = "round";

  context.beginPath();
  context.moveTo(cx - size * spread, cy - size * lift);
  context.quadraticCurveTo(cx - size * 0.08, cy + size * 0.1, cx, cy);
  context.quadraticCurveTo(cx + size * 0.08, cy + size * 0.1, cx + size * spread, cy - size * lift);
  context.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

type BirdState = {
  radius: number;
  height: number;
  centerX: number;
  centerZ: number;
  speed: number;
  phase: number;
  direction: 1 | -1;
  flapPhase: number;
  flapSpeed: number;
  bobAmp: number;
  bobPhase: number;
};

export type BirdsProps = {
  /** quantidade de passaros; 0 desliga o bando */
  count: number;
  seed: number;
  reduceMotion: boolean;
  /** com a mensagem aberta o bando esmaece, igual as particulas de vento */
  dimmed: boolean;
};

export function Birds({ count, seed, reduceMotion, dimmed }: BirdsProps) {
  const groupRef = useRef<THREE.Group | null>(null);
  const spriteRefs = useRef<Array<THREE.Sprite | null>>([]);
  const opacityRef = useRef(0);

  const [wingsOpenTexture, wingsClosedTexture] = useMemo(
    () => [createBirdTexture(true), createBirdTexture(false)],
    [],
  );

  const birds = useMemo<BirdState[]>(() => {
    if (count === 0) return [];
    const random = createRandom(seed ^ 0x62a3e9f1);
    return Array.from({ length: count }, () => ({
      radius: 6 + random() * 5,
      height: 6.5 + random() * 3.5,
      centerX: (random() - 0.5) * 3,
      centerZ: (random() - 0.5) * 3,
      speed: 0.09 + random() * 0.06,
      phase: random() * Math.PI * 2,
      direction: random() < 0.5 ? 1 : -1,
      flapPhase: random() * Math.PI * 2,
      flapSpeed: 5.5 + random() * 2.5,
      bobAmp: 0.15 + random() * 0.2,
      bobPhase: random() * Math.PI * 2,
    }));
  }, [count, seed]);

  useEffect(() => {
    return () => {
      wingsOpenTexture?.dispose();
      wingsClosedTexture?.dispose();
    };
  }, [wingsClosedTexture, wingsOpenTexture]);

  useFrame((state, delta) => {
    const group = groupRef.current;
    if (!group || count === 0) {
      return;
    }

    const targetOpacity = dimmed ? 0.15 : 0.82;
    opacityRef.current += (targetOpacity - opacityRef.current) * Math.min(1, delta * 2.2);

    const time = state.clock.elapsedTime;
    const motionScale = reduceMotion ? 0.25 : 1;

    for (let index = 0; index < birds.length; index += 1) {
      const bird = birds[index];
      const sprite = spriteRefs.current[index];
      if (!sprite) continue;

      const angle = bird.phase + time * bird.speed * bird.direction * motionScale;
      const x = bird.centerX + Math.cos(angle) * bird.radius;
      const z = bird.centerZ + Math.sin(angle) * bird.radius;
      const y = bird.height + Math.sin(time * 0.6 + bird.bobPhase) * bird.bobAmp;

      sprite.position.set(x, y, z);

      // orienta o sprite ao longo da trajetoria (visual de "voando para frente")
      const heading = Math.atan2(
        Math.cos(angle) * bird.direction,
        -Math.sin(angle) * bird.direction,
      );
      sprite.material.rotation = heading * 0.35;

      const flap = Math.sin(time * bird.flapSpeed * motionScale + bird.flapPhase);
      sprite.material.map = flap > 0.15 ? wingsOpenTexture : wingsClosedTexture;
      sprite.material.needsUpdate = true;
      sprite.material.opacity = opacityRef.current;

      const scale = 0.55 + Math.max(0, flap) * 0.08;
      sprite.scale.set(scale, scale, scale);
    }
  });

  if (count === 0 || !wingsOpenTexture || !wingsClosedTexture) {
    return null;
  }

  return (
    <group ref={groupRef}>
      {birds.map((_, index) => (
        <sprite
          key={`bird-${index}`}
          ref={(sprite) => {
            spriteRefs.current[index] = sprite;
          }}
          renderOrder={1}
        >
          <spriteMaterial
            map={wingsOpenTexture}
            transparent
            depthWrite={false}
            opacity={0}
            toneMapped={false}
          />
        </sprite>
      ))}
    </group>
  );
}
