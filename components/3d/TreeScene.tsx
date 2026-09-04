"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";

import { FlyingLeaf, type FlyingLeafPhase } from "@/components/3d/FlyingLeaf";
import { Foliage } from "@/components/3d/Foliage";
import { Panorama } from "@/components/3d/Panorama";
import { TreeBark } from "@/components/3d/TreeBark";
import { WindParticles } from "@/components/3d/WindParticles";
import { GRASS_FAR_COLOR, GRASS_NEAR_COLOR, HORIZON_COLOR } from "@/lib/theme/panorama";
import {
  MESSAGE_LEAF_COUNT,
  SCENE_QUALITY_CONFIGS,
  SUN_CAMERA_YAW,
  SUN_POSITION,
} from "@/lib/theme/scene-tokens";
import { type SceneVariant, SCENE_VARIANT_TOKENS } from "@/lib/theme/scene-variant";
import { generateTree } from "@/lib/tree/generateTree";
import type { QualityConfig, QualityProfile } from "@/types/performance";

export type TreeSceneProps = {
  seed: number;
  qualityProfile: QualityProfile;
  isMobile: boolean;
  reduceMotion: boolean;
  introActive: boolean;
  /** o painel de mensagem esta aberto; quando vira false a folha volta */
  messageOpen: boolean;
  /** muda quando as frases sao redistribuidas (troca de tema): zera as "lidas" */
  quoteMappingKey: string;
  /** variante visual determinada pela hora do dia */
  sceneVariant: SceneVariant;
  onSuggestProfile: (profile: QualityProfile) => void;
  /** entrega a API imperativa da cena para a interface */
  onSceneApi: (api: TreeSceneApi) => void;
  onLeafPick: (leafIndex: number) => void;
  onLeafArrive: () => void;
  onLeafReleased: () => void;
  onHoverChange: (hovering: boolean) => void;
  onSceneReady: () => void;
};

export type TreeSceneApi = {
  pickRandomLeaf: () => void;
  pickLeaf: (index: number) => void;
};

const TREE_OFFSET = new THREE.Vector3(0, 0, 0);
const WORLD_UP = new THREE.Vector3(0, 1, 0);

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

function AdaptiveQuality({
  profile,
  onSuggestProfile,
}: {
  profile: QualityProfile;
  onSuggestProfile: (profile: QualityProfile) => void;
}) {
  const elapsedRef = useRef(0);
  const framesRef = useRef(0);
  const lowSamplesRef = useRef(0);
  const suggestedRef = useRef(false);

  useEffect(() => {
    suggestedRef.current = false;
    lowSamplesRef.current = 0;
  }, [profile]);

  useFrame((_, delta) => {
    if (profile === "safe" || suggestedRef.current) {
      return;
    }

    elapsedRef.current += delta;
    framesRef.current += 1;

    if (elapsedRef.current < 2) {
      return;
    }

    const fps = framesRef.current / elapsedRef.current;
    elapsedRef.current = 0;
    framesRef.current = 0;

    if (fps < (profile === "high" ? 40 : 26)) {
      lowSamplesRef.current += 1;
    } else {
      lowSamplesRef.current = 0;
    }

    if (lowSamplesRef.current >= 3) {
      suggestedRef.current = true;
      onSuggestProfile(profile === "high" ? "medium" : "safe");
    }
  });

  return null;
}

/**
 * Textura procedural de grama gerada em canvas.
 * Gradiente radial (escurece do centro) + grain fractal suave.
 */
function createGroundTexture(): THREE.CanvasTexture | null {
  if (typeof document === "undefined") return null;

  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const near = new THREE.Color(GRASS_NEAR_COLOR);
  const far = new THREE.Color(GRASS_FAR_COLOR);

  const imageData = ctx.createImageData(size, size);
  const data = imageData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = (x / size) * 2 - 1;
      const dy = (y / size) * 2 - 1;
      const dist = Math.min(1, Math.sqrt(dx * dx + dy * dy));
      const t = Math.pow(dist, 0.6);
      const r = near.r + (far.r - near.r) * t;
      const g = near.g + (far.g - near.g) * t;
      const b = near.b + (far.b - near.b) * t;
      const noise = (Math.sin(x * 17.3 + y * 5.7) * 0.5 + Math.sin(x * 3.1 + y * 11.9) * 0.5) * 0.04;
      const idx = (y * size + x) * 4;
      data[idx]     = Math.min(255, Math.round((r + noise) * 255));
      data[idx + 1] = Math.min(255, Math.round((g + noise) * 255));
      data[idx + 2] = Math.min(255, Math.round((b + noise) * 255));
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  texture.anisotropy = 4;
  return texture;
}

function Ground({
  receiveShadow,
  crownRadius,
}: {
  receiveShadow: boolean;
  crownRadius: number;
}) {
  const [groundTexture] = useState(() => createGroundTexture());

  const geometry = useMemo(() => {
    const circle = new THREE.CircleGeometry(48, 96);
    const position = circle.attributes.position;
    const colors = new Float32Array(position.count * 3);
    const near = new THREE.Color(GRASS_NEAR_COLOR);
    const far  = new THREE.Color(GRASS_FAR_COLOR);
    const color = new THREE.Color();

    for (let index = 0; index < position.count; index += 1) {
      const distance = Math.hypot(position.getX(index), position.getY(index));
      const t = THREE.MathUtils.clamp(distance / 48, 0, 1);
      color.copy(near).lerp(far, Math.pow(t, 0.5));
      colors[index * 3]     = color.r;
      colors[index * 3 + 1] = color.g;
      colors[index * 3 + 2] = color.b;
    }

    circle.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return circle;
  }, []);

  useEffect(() => {
    return () => {
      geometry.dispose();
      groundTexture?.dispose();
    };
  }, [geometry, groundTexture]);

  const aoRadius = Math.max(2.2, crownRadius * 0.85);

  return (
    <group>
      <mesh geometry={geometry} rotation={[-Math.PI / 2, 0, 0]} receiveShadow={receiveShadow}>
        <meshStandardMaterial
          vertexColors
          map={groundTexture ?? undefined}
          roughness={0.95}
          metalness={0}
        />
      </mesh>

      {/* terra exposta no pé da árvore */}
      <mesh position={[0, 0.004, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.85, 48]} />
        <meshStandardMaterial color="#5C5136" roughness={1} metalness={0} />
      </mesh>

      {/* blob AO sob a copa — presente em todos os perfis */}
      <mesh position={[0, 0.006, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[aoRadius, 64]} />
        <meshBasicMaterial
          color="#0E1A0A"
          transparent
          opacity={receiveShadow ? 0.10 : 0.28}
          depthWrite={false}
        />
      </mesh>

      {/* anel de sombra de contato extra quando não há shadow map */}
      {!receiveShadow && (
        <mesh position={[0, 0.007, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.75, 1.8, 48]} />
          <meshBasicMaterial color="#1B2A14" transparent opacity={0.22} depthWrite={false} />
        </mesh>
      )}
    </group>
  );
}

function SceneContent({
  quality,
  seed,
  isMobile,
  reduceMotion,
  introActive,
  messageOpen,
  quoteMappingKey,
  sceneVariant,
  onSuggestProfile,
  onSceneApi,
  onLeafPick,
  onLeafArrive,
  onLeafReleased,
  onHoverChange,
  onSceneReady,
}: {
  quality: QualityConfig;
  seed: number;
  isMobile: boolean;
  reduceMotion: boolean;
  introActive: boolean;
  messageOpen: boolean;
  quoteMappingKey: string;
  sceneVariant: SceneVariant;
  onSuggestProfile: (profile: QualityProfile) => void;
  onSceneApi: (api: TreeSceneApi) => void;
  onLeafPick: (leafIndex: number) => void;
  onLeafArrive: () => void;
  onLeafReleased: () => void;
  onHoverChange: (hovering: boolean) => void;
  onSceneReady: () => void;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const sunRef = useRef<THREE.DirectionalLight | null>(null);
  const sunScratch = useMemo(() => new THREE.Vector3(), []);

  const tokens = SCENE_VARIANT_TOKENS[sceneVariant];

  const [hoveredMessage, setHoveredMessage] = useState<number | null>(null);
  const [activeMessage, setActiveMessage] = useState<number | null>(null);
  const [flightPhase, setFlightPhase] = useState<FlyingLeafPhase>("idle");
  const [readMessages, setReadMessages] = useState<number[]>([]);

  const introProgressRef = useRef(0);
  const introSeedRef = useRef(seed);
  const readyRef = useRef(false);

  const tree = useMemo(
    () =>
      generateTree({
        seed,
        maxOrder: quality.branchOrder,
        trunkHeight: 2.35,
        trunkRadius: 0.19,
        leafTarget: quality.leafCount,
        messageLeafCount: MESSAGE_LEAF_COUNT,
        leafDensity: quality.leafDensity,
      }),
    [quality.branchOrder, quality.leafCount, quality.leafDensity, seed],
  );

  const framing = useMemo(() => {
    const height = Math.max(2.5, tree.height);
    const radius = Math.max(1.4, tree.crownRadius);
    const distance = Math.max(height * 1.5, radius * 2.7) * (isMobile ? 1.34 : 1.12);
    return { height, distance, targetY: height * 0.46, cameraY: height * 0.52 };
  }, [isMobile, tree.crownRadius, tree.height]);

  const shadowExtent = Math.max(6, tree.crownRadius * 1.8, tree.height * 0.9);

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    console.info(
      `[arvore] semente ${seed} | ${tree.branches.length} galhos | ${tree.leaves.length} folhas | ` +
        `${tree.messageLeaves.length} folhas-mensagem | altura ${tree.height.toFixed(2)} | ` +
        `copa ${tree.crownRadius.toFixed(2)} | variante ${sceneVariant}`,
    );
  }, [seed, sceneVariant, tree]);

  const [prevSeed, setPrevSeed] = useState(seed);
  if (seed !== prevSeed) {
    setPrevSeed(seed);
    setActiveMessage(null);
    setFlightPhase("idle");
    setReadMessages([]);
    setHoveredMessage(null);
  }

  const [prevMappingKey, setPrevMappingKey] = useState(quoteMappingKey);
  if (quoteMappingKey !== prevMappingKey) {
    setPrevMappingKey(quoteMappingKey);
    setReadMessages([]);
  }

  const [prevMessageOpen, setPrevMessageOpen] = useState(messageOpen);
  if (messageOpen !== prevMessageOpen) {
    setPrevMessageOpen(messageOpen);
    if (!messageOpen && flightPhase === "held") setFlightPhase("returning");
  }

  useEffect(() => {
    document.body.style.cursor = hoveredMessage === null ? "auto" : "pointer";
    return () => { document.body.style.cursor = "auto"; };
  }, [hoveredMessage]);

  const startFlight = useCallback(
    (index: number) => {
      if (index < 0 || index >= tree.messageLeaves.length) return;
      setActiveMessage(index);
      setFlightPhase("flying");
      setHoveredMessage(null);
      onLeafPick(index);
    },
    [onLeafPick, tree.messageLeaves.length],
  );

  const pickRandomLeaf = useCallback(() => {
    if (tree.messageLeaves.length === 0 || flightPhase !== "idle") return;
    const all = tree.messageLeaves.map((_, i) => i);
    const unread = all.filter((i) => !readMessages.includes(i));
    const pool = unread.length > 0 ? unread : all;
    startFlight(pool[Math.floor(Math.random() * pool.length)]);
  }, [flightPhase, readMessages, startFlight, tree.messageLeaves]);

  const pickLeaf = useCallback(
    (index: number) => { if (flightPhase !== "idle") return; startFlight(index); },
    [flightPhase, startFlight],
  );

  useEffect(() => { onSceneApi({ pickRandomLeaf, pickLeaf }); }, [onSceneApi, pickLeaf, pickRandomLeaf]);

  const handleArrive = useCallback(() => { setFlightPhase("held"); onLeafArrive(); }, [onLeafArrive]);

  const handleReturned = useCallback(() => {
    setReadMessages((current) =>
      activeMessage !== null && !current.includes(activeMessage) ? [...current, activeMessage] : current,
    );
    setActiveMessage(null);
    setFlightPhase("idle");
    onLeafReleased();
  }, [activeMessage, onLeafReleased]);

  const handleHover = useCallback(
    (index: number | null) => { setHoveredMessage(index); onHoverChange(index !== null); },
    [onHoverChange],
  );

  useFrame((state, delta) => {
    if (!readyRef.current) { readyRef.current = true; onSceneReady(); }

    const sun = sunRef.current;
    if (sun) {
      sunScratch.set(camera.position.x, 0, camera.position.z);
      if (sunScratch.lengthSq() < 1e-6) sunScratch.set(0, 0, 1);
      sunScratch.normalize().applyAxisAngle(WORLD_UP, SUN_CAMERA_YAW);
      SUN_POSITION.set(
        sunScratch.x * framing.distance * 1.15,
        framing.height * 1.9,
        sunScratch.z * framing.distance * 1.15,
      );
      sun.position.copy(SUN_POSITION);
      sun.target.position.set(0, framing.targetY, 0);
      sun.target.updateMatrixWorld();
    }

    if (introSeedRef.current !== seed) {
      introSeedRef.current = seed;
      introProgressRef.current = 0;
    }

    const controls = controlsRef.current;
    if (!controls) return;

    if (introActive && introProgressRef.current < 1) {
      introProgressRef.current = Math.min(1, introProgressRef.current + delta / (reduceMotion ? 0.6 : 2.6));
      const t = easeOutCubic(introProgressRef.current);
      const distance = THREE.MathUtils.lerp(framing.distance * 1.85, framing.distance, t);
      const angle = -0.55 + t * 0.55;
      const y = THREE.MathUtils.lerp(framing.height * 0.08, framing.cameraY, t);
      camera.position.set(Math.sin(angle) * distance, y, Math.cos(angle) * distance);
      controls.target.set(0, THREE.MathUtils.lerp(framing.height * 0.18, framing.targetY, t), 0);
      camera.lookAt(controls.target);
      controls.update();
      return;
    }

    controls.autoRotate = flightPhase === "idle" && !reduceMotion;
    controls.autoRotateSpeed = 0.22;

    if (flightPhase !== "idle") {
      const desired = framing.targetY + 0.05;
      controls.target.y += (desired - controls.target.y) * Math.min(1, delta * 2);
    }

    void state;
  });

  return (
    <>
      <Panorama resolution={quality.profile === "safe" ? 1024 : 2048} sceneVariant={sceneVariant} />
      <fog attach="fog" args={[tokens.fogColor, framing.distance * 1.4, framing.distance * 5 * tokens.fogDensityMultiplier]} />

      <hemisphereLight intensity={1.15} color={tokens.skyColor} groundColor={tokens.groundColor} />
      <ambientLight intensity={tokens.ambientIntensity} color={tokens.ambientColor} />

      <directionalLight
        ref={sunRef}
        position={[SUN_POSITION.x, SUN_POSITION.y, SUN_POSITION.z]}
        intensity={tokens.sunIntensity}
        color={tokens.sunColor}
        castShadow={quality.shadows}
        shadow-mapSize-width={quality.shadowMapSize}
        shadow-mapSize-height={quality.shadowMapSize}
        shadow-camera-near={2}
        shadow-camera-far={42}
        shadow-camera-left={-shadowExtent}
        shadow-camera-right={shadowExtent}
        shadow-camera-top={shadowExtent}
        shadow-camera-bottom={-shadowExtent}
        shadow-bias={-0.0004}
        shadow-normalBias={0.06}
      />

      <directionalLight position={[-6, 4.5, -5]} intensity={0.6} color="#9FBEDA" />

      <group position={TREE_OFFSET}>
        <TreeBark branches={tree.branches} roots={tree.roots} detail={quality.detail} castShadow={quality.shadows} />
        <Foliage
          leaves={tree.leaves}
          messageLeaves={tree.messageLeaves}
          detail={quality.detail}
          windStrength={quality.windStrength}
          reduceMotion={reduceMotion}
          castShadow={quality.shadows}
          leafEmissiveBoost={tokens.leafEmissiveBoost}
          hiddenMessageIndex={flightPhase === "idle" ? null : activeMessage}
          hoveredMessageIndex={hoveredMessage}
          readMessageIndices={readMessages}
          onHoverMessage={handleHover}
          onSelectMessage={(index) => { if (flightPhase !== "idle") return; startFlight(index); }}
        />
      </group>

      <FlyingLeaf
        leaf={activeMessage === null ? null : (tree.messageLeaves[activeMessage] ?? null)}
        leafIndex={activeMessage}
        treeOffset={TREE_OFFSET}
        phase={flightPhase}
        reduceMotion={reduceMotion}
        isMobile={isMobile}
        onArrive={handleArrive}
        onReturned={handleReturned}
      />

      <WindParticles
        count={quality.windParticles}
        seed={seed}
        reduceMotion={reduceMotion}
        dimmed={messageOpen || introActive}
      />

      <Ground receiveShadow={quality.shadows} crownRadius={tree.crownRadius} />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        enabled={!introActive}
        enablePan={false}
        enableZoom
        enableDamping
        dampingFactor={0.06}
        rotateSpeed={isMobile ? 0.55 : 0.75}
        zoomSpeed={0.7}
        minDistance={framing.distance * 0.62}
        maxDistance={framing.distance * 2.1}
        minPolarAngle={0.25}
        maxPolarAngle={Math.PI * 0.46}
        target={[0, framing.targetY, 0]}
      />

      <AdaptiveQuality profile={quality.profile} onSuggestProfile={onSuggestProfile} />
    </>
  );
}

export default function TreeScene(props: TreeSceneProps) {
  const quality = SCENE_QUALITY_CONFIGS[props.qualityProfile];
  const dpr = props.isMobile ? Math.min(quality.dpr, 1.5) : quality.dpr;
  const tokens = SCENE_VARIANT_TOKENS[props.sceneVariant];

  return (
    <Canvas
      aria-label="Cena 3D interativa da Árvore das Emoções"
      role="img"
      shadows={quality.shadows ? { type: THREE.PCFSoftShadowMap } : false}
      camera={{ position: [0, 2, 9], fov: 38, near: 0.1, far: 220 }}
      dpr={[1, dpr]}
      gl={{
        antialias: quality.profile !== "safe",
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: tokens.toneMappingExposure,
      }}
    >
      <Suspense fallback={null}>
        <SceneContent
          quality={quality}
          seed={props.seed}
          isMobile={props.isMobile}
          reduceMotion={props.reduceMotion}
          introActive={props.introActive}
          messageOpen={props.messageOpen}
          quoteMappingKey={props.quoteMappingKey}
          sceneVariant={props.sceneVariant}
          onSuggestProfile={props.onSuggestProfile}
          onSceneApi={props.onSceneApi}
          onLeafPick={props.onLeafPick}
          onLeafArrive={props.onLeafArrive}
          onLeafReleased={props.onLeafReleased}
          onHoverChange={props.onHoverChange}
          onSceneReady={props.onSceneReady}
        />
      </Suspense>
    </Canvas>
  );
}
