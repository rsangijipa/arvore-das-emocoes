"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";

/**
 * Poeira de vento.
 *
 * Particulas minusculas que atravessam a cena na mesma direcao do vento que
 * balanca a copa. Elas nao sao "neve": cada uma carrega uma fase propria de
 * turbulencia, entao o campo inteiro ondula em vez de cair em linha reta —
 * e o que faz o ar parecer em movimento e nao a camera.
 *
 * Tudo vive num unico THREE.Points com material aditivo e depthWrite
 * desligado: uma chamada de desenho, sem custo de sombra e sem ordenacao de
 * transparencia contra as 2000+ folhas.
 */

/** caixa de ar em volta da arvore — as particulas circulam dentro dela */
const FIELD_WIDTH = 26;
const FIELD_HEIGHT = 9;
const FIELD_DEPTH = 20;

/** direcao dominante do vento (mesma inclinacao do balanco da copa) */
const WIND = new THREE.Vector3(-1, 0.08, 0.34).normalize();

function createSpriteTexture() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,252,238,1)");
  gradient.addColorStop(0.35, "rgba(255,246,214,0.55)");
  gradient.addColorStop(1, "rgba(255,240,200,0)");

  context.fillStyle = gradient;
  context.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** LCG: o campo precisa nascer identico em cada render da mesma semente */
function createRandom(seed: number) {
  let state = (seed | 0) || 1;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) | 0;
    return (state >>> 0) / 4294967296;
  };
}

export type WindParticlesProps = {
  /** quantidade de particulas; 0 desliga o campo */
  count: number;
  /** mesma semente da arvore: o ar tambem se reembaralha a cada visita */
  seed: number;
  reduceMotion: boolean;
  /** com a mensagem aberta o campo esmaece, para nao competir com o texto */
  dimmed: boolean;
};

export function WindParticles({ count, seed, reduceMotion, dimmed }: WindParticlesProps) {
  const pointsRef = useRef<THREE.Points | null>(null);
  const materialRef = useRef<THREE.PointsMaterial | null>(null);
  const opacityRef = useRef(0);

  const texture = useMemo(() => createSpriteTexture(), []);

  /** estado por particula fora do buffer: fase, velocidade e amplitude */
  const motion = useMemo(() => {
    return {
      phase: new Float32Array(count),
      speed: new Float32Array(count),
      sway: new Float32Array(count),
    };
  }, [count]);

  const geometry = useMemo(() => {
    const random = createRandom(seed ^ 0x5f3a7c1d);
    const positions = new Float32Array(count * 3);

    for (let index = 0; index < count; index += 1) {
      positions[index * 3] = (random() - 0.5) * FIELD_WIDTH;
      positions[index * 3 + 1] = random() * FIELD_HEIGHT + 0.15;
      positions[index * 3 + 2] = (random() - 0.5) * FIELD_DEPTH;

      motion.phase[index] = random() * Math.PI * 2;
      motion.speed[index] = 0.5 + random() * 1.15;
      motion.sway[index] = 0.25 + random() * 0.75;
    }

    const buffer = new THREE.BufferGeometry();
    buffer.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return buffer;
  }, [count, motion, seed]);

  useEffect(() => {
    return () => {
      geometry.dispose();
      texture?.dispose();
    };
  }, [geometry, texture]);

  useFrame((state, delta) => {
    const points = pointsRef.current;
    const material = materialRef.current;
    if (!points || !material || count === 0) {
      return;
    }

    // fade de entrada/saida: nada aparece de estalo quando o painel fecha
    const targetOpacity = dimmed ? 0.16 : 0.62;
    opacityRef.current += (targetOpacity - opacityRef.current) * Math.min(1, delta * 2.4);
    material.opacity = opacityRef.current;

    if (reduceMotion) {
      return;
    }

    const attribute = points.geometry.getAttribute("position") as THREE.BufferAttribute;
    const array = attribute.array as Float32Array;
    const time = state.clock.elapsedTime;
    const step = Math.min(delta, 0.05);

    // rajada lenta: o vento inteiro acelera e afrouxa em ciclos longos
    const gust = 0.68 + Math.sin(time * 0.27) * 0.22 + Math.sin(time * 0.61) * 0.1;

    for (let index = 0; index < count; index += 1) {
      const offset = index * 3;
      const speed = motion.speed[index] * gust;
      const phase = motion.phase[index];
      const sway = motion.sway[index];

      array[offset] += WIND.x * speed * step;
      array[offset + 1] +=
        (WIND.y * speed + Math.sin(time * 1.35 + phase) * 0.13 * sway) * step;
      array[offset + 2] +=
        (WIND.z * speed + Math.cos(time * 0.95 + phase * 1.7) * 0.22 * sway) * step;

      // reciclagem: quem sai por um lado da caixa reentra pelo oposto
      if (array[offset] < -FIELD_WIDTH / 2) {
        array[offset] = FIELD_WIDTH / 2;
        array[offset + 1] = Math.random() * FIELD_HEIGHT + 0.15;
        array[offset + 2] = (Math.random() - 0.5) * FIELD_DEPTH;
      }

      if (array[offset + 1] > FIELD_HEIGHT) {
        array[offset + 1] = 0.15;
      } else if (array[offset + 1] < 0.1) {
        array[offset + 1] = FIELD_HEIGHT;
      }

      if (array[offset + 2] > FIELD_DEPTH / 2) {
        array[offset + 2] = -FIELD_DEPTH / 2;
      } else if (array[offset + 2] < -FIELD_DEPTH / 2) {
        array[offset + 2] = FIELD_DEPTH / 2;
      }
    }

    attribute.needsUpdate = true;
  });

  if (count === 0 || !texture) {
    return null;
  }

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false} renderOrder={2}>
      <pointsMaterial
        ref={materialRef}
        map={texture}
        color="#FFF3D6"
        size={0.075}
        sizeAttenuation
        transparent
        opacity={0}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
}
