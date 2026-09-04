"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import type { LeafNode } from "@/lib/tree/generateTree";
import { createLeafDetailTexture, messageLeafTone } from "@/lib/tree/leafArtwork";
import { createLeafVariants } from "@/lib/tree/leafGeometry";
import { createLeafMaterial, updateSunDirection } from "@/lib/tree/leafMaterial";
import { SUN_POSITION } from "@/lib/theme/scene-tokens";

type FoliageProps = {
  leaves: LeafNode[];
  messageLeaves: LeafNode[];
  detail: number;
  windStrength: number;
  reduceMotion: boolean;
  castShadow: boolean;
  /** indice da folha-mensagem que esta voando (fica invisivel na copa) */
  hiddenMessageIndex: number | null;
  hoveredMessageIndex: number | null;
  readMessageIndices: number[];
  /** boost emissivo sazonal (ex: noite = halos mais brilhantes) */
  leafEmissiveBoost: number;
  onHoverMessage: (index: number | null) => void;
  onSelectMessage: (index: number) => void;
};

/** folhas comuns: gradiente de verdes, do interior sombreado a borda ensolarada */
const COMMON_TONES = [
  new THREE.Color("#2F5228"),
  new THREE.Color("#3D6A2E"),
  new THREE.Color("#4E8236"),
  new THREE.Color("#5F9A3D"),
  new THREE.Color("#74AE49"),
  new THREE.Color("#8CC155"),
  new THREE.Color("#A6CE68"),
];

/**
 * Folhas com mensagem: tons terrosos claros sorteados pela MESMA formula que
 * pinta o cartao SVG. A folha que brilha na copa e a folha que abre na tela —
 * so muda a resolucao.
 */

const MESSAGE_HOVER = new THREE.Color("#FBEAC0");
const MESSAGE_READ = new THREE.Color("#7A6A57");
const AUTUMN_TONE = new THREE.Color("#C9A65A");

/**
 * Rede de seguranca: com `vertexColors` ligado, uma geometria sem o atributo
 * `color` recebe (0,0,0) do WebGL e a malha inteira renderiza preta.
 */
function ensureVertexColors(geometry: THREE.BufferGeometry) {
  if (!geometry.attributes.color) {
    const count = geometry.attributes.position.count;
    geometry.setAttribute("color", new THREE.Float32BufferAttribute(new Float32Array(count * 3).fill(1), 3));
  }

  return geometry;
}

/** monta a rotacao que alinha +Y com a direcao da lamina e +Z com a face */
function composeLeafMatrix(
  leaf: LeafNode,
  scaleMultiplier: number,
  target: THREE.Matrix4,
  helpers: { x: THREE.Vector3; y: THREE.Vector3; z: THREE.Vector3; quaternion: THREE.Quaternion; rotation: THREE.Matrix4 },
) {
  helpers.y.copy(leaf.direction).normalize();
  helpers.z.copy(leaf.normal);
  helpers.z.addScaledVector(helpers.y, -helpers.z.dot(helpers.y));

  if (helpers.z.lengthSq() < 1e-8) {
    helpers.z.set(0, 0, 1).addScaledVector(helpers.y, -helpers.y.z);
    if (helpers.z.lengthSq() < 1e-8) {
      helpers.z.set(1, 0, 0);
    }
  }

  helpers.z.normalize();
  helpers.x.crossVectors(helpers.y, helpers.z).normalize();

  helpers.rotation.makeBasis(helpers.x, helpers.y, helpers.z);
  helpers.quaternion.setFromRotationMatrix(helpers.rotation);

  const scale = leaf.scale * scaleMultiplier;
  target.compose(leaf.position, helpers.quaternion, new THREE.Vector3(scale, scale, scale));
}

export function Foliage({
  leaves,
  messageLeaves,
  detail,
  windStrength,
  reduceMotion,
  castShadow,
  hiddenMessageIndex,
  hoveredMessageIndex,
  readMessageIndices,
  leafEmissiveBoost,
  onHoverMessage,
  onSelectMessage,
}: FoliageProps) {
  const { camera } = useThree();

  const commonRefs = useRef<Array<THREE.InstancedMesh | null>>([]);
  const messageRef = useRef<THREE.InstancedMesh | null>(null);
  const haloRefs = useRef<Array<THREE.Sprite | null>>([]);

  const matrixHelpers = useMemo(
    () => ({
      x: new THREE.Vector3(),
      y: new THREE.Vector3(),
      z: new THREE.Vector3(),
      quaternion: new THREE.Quaternion(),
      rotation: new THREE.Matrix4(),
    }),
    [],
  );

  const variantGeometries = useMemo(() => createLeafVariants(detail), [detail]);

  const groups = useMemo(() => {
    const buckets: LeafNode[][] = [[], [], []];
    for (const leaf of leaves) {
      buckets[Math.min(2, leaf.variant)].push(leaf);
    }
    return buckets;
  }, [leaves]);

  // geometrias por mesh (clonadas: cada InstancedMesh precisa dos proprios
  // atributos por instancia)
  const commonGeometries = useMemo(() => {
    return groups.map((group, index) => {
      const geometry = ensureVertexColors(variantGeometries[index].clone());
      const count = Math.max(1, group.length);
      const phases = new Float32Array(count);
      const stiffness = new Float32Array(count);

      for (let i = 0; i < count; i += 1) {
        const leaf = group[i];
        phases[i] = leaf ? leaf.phase : 0;
        stiffness[i] = leaf ? 0.6 + leaf.exposure * 0.8 : 1;
      }

      geometry.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phases, 1));
      geometry.setAttribute("aStiffness", new THREE.InstancedBufferAttribute(stiffness, 1));
      return geometry;
    });
  }, [groups, variantGeometries]);

  const messageGeometry = useMemo(() => {
    const geometry = ensureVertexColors(variantGeometries[3].clone());
    const count = Math.max(1, messageLeaves.length);
    const phases = new Float32Array(count);
    const stiffness = new Float32Array(count);

    for (let i = 0; i < count; i += 1) {
      phases[i] = messageLeaves[i]?.phase ?? 0;
      stiffness[i] = 0.55;
    }

    geometry.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phases, 1));
    geometry.setAttribute("aStiffness", new THREE.InstancedBufferAttribute(stiffness, 1));
    return geometry;
  }, [messageLeaves, variantGeometries]);

  /**
   * Materiais vivem em refs, nao em useMemo: os uniforms sao escritos a cada
   * frame e o React Compiler trata valor memoizado como imutavel. A forca do
   * vento e sincronizada no loop, entao trocar de perfil nao recria o shader.
   */
  const [materials] = useState(() => ({
      common: createLeafMaterial({
        color: "#ffffff",
        subsurfaceColor: "#9ED063",
        subsurfaceIntensity: 0.9,
        roughness: 0.72,
        vertexColors: true,
        windStrength,
        cacheKey: "leaf-common-v2",
      }),
      message: createLeafMaterial({
        color: "#ffffff",
        subsurfaceColor: "#F0E39A",
        subsurfaceIntensity: 1.25,
        roughness: 0.58,
        vertexColors: true,
        windStrength: windStrength * 0.55,
        cacheKey: "leaf-message-v2",
        emissive: "#2A3410",
        emissiveIntensity: 0.55,
      }),
  }));

  const commonMaterial = materials.common;
  const messageMaterial = materials.message;

  /**
   * Nervuras da folha-mensagem vindas do desenho vetorial.
   *
   * Uma textura so, em tons de cinza, multiplicada pela cor de cada instancia:
   * as dez folhas compartilham o desenho e mantem tons terrosos diferentes,
   * sem custar dez materiais nem quebrar o instanciamento.
   */
  const [detailTexture] = useState(() => createLeafDetailTexture(512));

  useEffect(() => {
    if (!detailTexture) {
      return;
    }

    messageMaterial.material.map = detailTexture;
    messageMaterial.material.needsUpdate = true;

    return () => {
      messageMaterial.material.map = null;
      detailTexture.dispose();
    };
  }, [detailTexture, messageMaterial]);

  const [haloTexture] = useState<THREE.CanvasTexture | null>(() => {
    if (typeof document === "undefined") {
      return null;
    }

    {
      const size = 128;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext("2d");
    if (!context) {
      return null;
    }

    const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, "rgba(255,232,182,0.88)");
    gradient.addColorStop(0.35, "rgba(232,178,106,0.34)");
    gradient.addColorStop(1, "rgba(232,178,106,0)");
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    }
  });

  // ------------------------------------------------- matrizes e cores fixas
  useEffect(() => {
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();

    for (let variant = 0; variant < groups.length; variant += 1) {
      const mesh = commonRefs.current[variant];
      const group = groups[variant];
      if (!mesh) {
        continue;
      }

      for (let index = 0; index < group.length; index += 1) {
        const leaf = group[index];
        composeLeafMatrix(leaf, 1, matrix, matrixHelpers);
        mesh.setMatrixAt(index, matrix);

        // verde interpolado continuamente: exposicao define o tom base e a fase
        // da folha adiciona a variacao individual
        const jitter = ((leaf.phase * 7.13) % 1) - 0.5;
        const tone = THREE.MathUtils.clamp(leaf.exposure * 0.82 + 0.12 + jitter * 0.3, 0, 1);
        const scaled = tone * (COMMON_TONES.length - 1);
        const lower = Math.floor(scaled);
        const upper = Math.min(COMMON_TONES.length - 1, lower + 1);

        color.copy(COMMON_TONES[lower]).lerp(COMMON_TONES[upper], scaled - lower);

        // algumas folhas amarelam na borda ensolarada da copa
        if (leaf.exposure > 0.78 && ((leaf.phase * 3.7) % 1) < 0.08) {
          color.lerp(AUTUMN_TONE, 0.5);
        }

        mesh.setColorAt(index, color);
      }

      mesh.count = group.length;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) {
        mesh.instanceColor.needsUpdate = true;
      }
      mesh.computeBoundingSphere();
    }

    if (process.env.NODE_ENV === "development") {
      const sample = commonRefs.current.find(Boolean);
      console.info(
        "[folhas] vertexColors=%s | atributo color=%s | instanceColor=%s",
        commonMaterial.material.vertexColors,
        Boolean(sample?.geometry.attributes.color),
        sample?.instanceColor ? Array.from(sample.instanceColor.array.slice(0, 3)) : null,
      );
    }
  }, [commonMaterial, groups, matrixHelpers]);

  // -------------------------------------- matrizes e cores das folhas-mensagem
  useEffect(() => {
    const mesh = messageRef.current;
    if (!mesh) {
      return;
    }

    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    const readSet = new Set(readMessageIndices);

    for (let index = 0; index < messageLeaves.length; index += 1) {
      const leaf = messageLeaves[index];
      const isHidden = hiddenMessageIndex === index;
      const isHovered = hoveredMessageIndex === index;

      composeLeafMatrix(leaf, isHidden ? 0 : isHovered ? 1.18 : 1, matrix, matrixHelpers);
      mesh.setMatrixAt(index, matrix);

      if (isHovered) {
        color.copy(MESSAGE_HOVER);
      } else if (readSet.has(index)) {
        color.copy(MESSAGE_READ);
      } else {
        color.copy(messageLeafTone(index));
      }

      mesh.setColorAt(index, color);
    }

    mesh.count = messageLeaves.length;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) {
      mesh.instanceColor.needsUpdate = true;
    }
    mesh.computeBoundingSphere();
  }, [hiddenMessageIndex, hoveredMessageIndex, matrixHelpers, messageLeaves, readMessageIndices]);

  useEffect(() => {
    return () => {
      commonGeometries.forEach((geometry) => geometry.dispose());
      messageGeometry.dispose();
    };
  }, [commonGeometries, messageGeometry]);

  useEffect(() => {
    return () => variantGeometries.forEach((geometry) => geometry.dispose());
  }, [variantGeometries]);

  // materiais e textura do halo vivem enquanto o componente existir
  useEffect(() => {
    return () => {
      materials.common.material.dispose();
      materials.message.material.dispose();
      haloTexture?.dispose();
    };
  }, [haloTexture, materials]);

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const wind = reduceMotion ? windStrength * 0.35 : windStrength;

    commonMaterial.uniforms.uTime.value = time;
    commonMaterial.uniforms.uWind.value = wind;
    messageMaterial.uniforms.uTime.value = time;
    messageMaterial.uniforms.uWind.value = wind * 0.55;

    updateSunDirection(commonMaterial.uniforms.uSunDirView.value, SUN_POSITION, camera);
    messageMaterial.uniforms.uSunDirView.value.copy(commonMaterial.uniforms.uSunDirView.value);

    // halos pulsando devagar, como vaga-lumes
    // a opacidade alvo é 0 quando a folha está voando e volta suavemente
    // (lerp a cada frame) para evitar o corte abrupto no retorno
    // leafEmissiveBoost aumenta a intensidade do halo à noite/entardecer
    const haloBase = 0.5 + leafEmissiveBoost * 0.6;
    for (let index = 0; index < haloRefs.current.length; index += 1) {
      const sprite = haloRefs.current[index];
      if (!sprite) {
        continue;
      }

      const hidden = hiddenMessageIndex === index;
      const pulse = 0.82 + Math.sin(time * 1.15 + index * 1.9) * 0.18;
      const hover = hoveredMessageIndex === index ? 1.45 : 1;

      const targetOpacity = hidden ? 0 : haloBase * pulse * hover;
      const targetScale   = hidden ? 0 : (0.42 + leafEmissiveBoost * 0.1) * pulse * hover;

      const mat = sprite.material as THREE.SpriteMaterial;

      const lerpSpeed = mat.opacity > targetOpacity ? 0.18 : 0.06;
      mat.opacity = THREE.MathUtils.lerp(mat.opacity, targetOpacity, lerpSpeed);

      const currentScale = sprite.scale.x;
      sprite.scale.setScalar(THREE.MathUtils.lerp(currentScale, targetScale, lerpSpeed));
    }
  });

  return (
    <group>
      {groups.map((group, variant) => (
        <instancedMesh
          key={`leaf-common-${variant}`}
          ref={(mesh) => {
            commonRefs.current[variant] = mesh;
            if (mesh) {
              mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
              // folhas comuns nao participam do raycast: hover/clique so nas
              // folhas com mensagem (e isso remove todo o custo de pointer move)
              mesh.raycast = () => null;
            }
          }}
          args={[commonGeometries[variant], commonMaterial.material, Math.max(1, group.length)]}
          castShadow={castShadow}
          frustumCulled={false}
        />
      ))}

      <instancedMesh
        ref={(mesh) => {
          messageRef.current = mesh;
          if (mesh) {
            mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
          }
        }}
        args={[messageGeometry, messageMaterial.material, Math.max(1, messageLeaves.length)]}
        castShadow={castShadow}
        frustumCulled={false}
        onPointerOver={(event) => {
          event.stopPropagation();
          if (event.instanceId === undefined) return;
          onHoverMessage(event.instanceId);
        }}
        onPointerOut={(event) => {
          event.stopPropagation();
          onHoverMessage(null);
        }}
        onClick={(event) => {
          event.stopPropagation();
          if (event.instanceId === undefined) return;
          if (event.instanceId === hiddenMessageIndex) return;
          onSelectMessage(event.instanceId);
        }}
      />

      {haloTexture
        ? messageLeaves.map((leaf, index) => (
            <sprite
              key={`halo-${index}`}
              ref={(sprite) => {
                haloRefs.current[index] = sprite;
              }}
              position={[
                leaf.position.x + leaf.direction.x * 0.12,
                leaf.position.y + leaf.direction.y * 0.12,
                leaf.position.z + leaf.direction.z * 0.12,
              ]}
            >
              <spriteMaterial
                map={haloTexture}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                opacity={0.5}
              />
            </sprite>
          ))
        : null}
    </group>
  );
}
