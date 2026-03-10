"use client";

import { OrbitControls, Sky } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { DepthOfField, EffectComposer } from "@react-three/postprocessing";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";

import { BranchInstances } from "@/components/3d/BranchInstances";
import { LeafInstances } from "@/components/3d/LeafInstances";
import { TreeTrunk } from "@/components/3d/TreeTrunk";
import {
  SCENE_QUALITY_CONFIGS,
  getCuratedTreeSeed,
} from "@/lib/theme/scene-tokens";
import { generateFractalTree, type LeafNode } from "@/lib/tree/generateTree";
import type { QualityConfig, QualityProfile } from "@/types/performance";
import type { Quote } from "@/types/quote";

type TreeSceneProps = {
  quotes: Quote[];
  favoriteQuoteIds: string[];
  qualityProfile: QualityProfile;
  activeTheme: Quote["theme"] | "all";
  selectedQuoteId: string | null;
  sessionSeedKey: string | null;
  treeSeedBump: number;
  introActive: boolean;
  isMobile: boolean;
  reduceMotion: boolean;
  showTutorialMarkers: boolean;
  onSuggestProfile: (profile: QualityProfile) => void;
  onLeafQuoteSelect: (quote: Quote) => void;
  onLeafHoverStateChange: (isHovering: boolean) => void;
  onSceneReady: () => void;
};

type LeafBinding = {
  leaf: LeafNode;
  quote: Quote | null;
};

function PerformanceObserver({
  profile,
  onSuggestProfile,
}: {
  profile: QualityProfile;
  onSuggestProfile: (profile: QualityProfile) => void;
}) {
  const sampleElapsedRef = useRef(0);
  const sampleFramesRef = useRef(0);
  const lowFpsSamplesRef = useRef(0);
  const lastSuggestionAtRef = useRef(0);

  useFrame(({ clock }, delta) => {
    if (profile === "safe") {
      return;
    }

    sampleElapsedRef.current += delta;
    sampleFramesRef.current += 1;

    if (sampleElapsedRef.current < 1.5) {
      return;
    }

    const fps = sampleFramesRef.current / sampleElapsedRef.current;
    const minTargetFps = profile === "high" ? 42 : 28;

    if (fps < minTargetFps) {
      lowFpsSamplesRef.current += 1;
    } else {
      lowFpsSamplesRef.current = 0;
    }

    const now = clock.elapsedTime;
    if (lowFpsSamplesRef.current >= 2 && now - lastSuggestionAtRef.current > 4) {
      lastSuggestionAtRef.current = now;
      lowFpsSamplesRef.current = 0;
      onSuggestProfile(profile === "high" ? "medium" : "safe");
    }

    sampleElapsedRef.current = 0;
    sampleFramesRef.current = 0;
  });

  return null;
}

function GroundTerrain() {
  return (
    <>
      <mesh position={[0, -0.65, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[45, 45]} />
        <meshStandardMaterial 
          color="#2A3B22"
          roughness={1.0} 
          metalness={0.0} 
        />
      </mesh>

      <mesh position={[0, -0.64, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[2.5, 32]} />
        <meshBasicMaterial
          color="#111A0D"
          transparent
          opacity={0.35}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

function SceneContent({
  quality,
  quotes,
  favoriteQuoteIds,
  activeTheme,
  selectedQuoteId,
  sessionSeedKey,
  treeSeedBump,
  introActive,
  isMobile,
  reduceMotion,
  showTutorialMarkers,
  onLeafQuoteSelect,
  onLeafHoverStateChange,
  onSceneReady,
  onSuggestProfile,
}: {
  quality: QualityConfig;
  quotes: Quote[];
  favoriteQuoteIds: string[];
  activeTheme: Quote["theme"] | "all";
  selectedQuoteId: string | null;
  sessionSeedKey: string | null;
  treeSeedBump: number;
  introActive: boolean;
  isMobile: boolean;
  reduceMotion: boolean;
  showTutorialMarkers: boolean;
  onLeafQuoteSelect: (quote: Quote) => void;
  onLeafHoverStateChange: (isHovering: boolean) => void;
  onSceneReady: () => void;
  onSuggestProfile: (profile: QualityProfile) => void;
}) {
  const treeRef = useRef<THREE.Group>(null);
  const controlsRef = useRef<OrbitControlsImpl | null>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [manualSelectedIndex, setManualSelectedIndex] = useState<number | null>(null);
  const treeSeed = useMemo(() => {
    const curatedSeed = getCuratedTreeSeed(quality.profile, "sunset", sessionSeedKey);
    return Math.abs(curatedSeed + treeSeedBump * 104729);
  }, [quality.profile, sessionSeedKey, treeSeedBump]);

  const treeData = useMemo(
    () =>
      generateFractalTree({
        maxDepth: quality.branchDepth,
        baseLength: 1.85,
        trunkHeight: 2.15,
        initialRadius: 0.14,
        leafDensity: quality.profile === "safe" ? 1.55 : 2.0,
        leafTarget: quality.leafCount,
        seed: treeSeed,
      }),
    [quality, treeSeed],
  );

  const leafBindings = useMemo<LeafBinding[]>(() => {
    const sourceLeaves = treeData.leaves;
    if (sourceLeaves.length === 0) {
      return [];
    }

    const sampledLeaves: LeafNode[] = [];

    if (sourceLeaves.length <= quality.leafCount) {
      sampledLeaves.push(...sourceLeaves);
    } else {
      const step = sourceLeaves.length / quality.leafCount;

      for (let index = 0; index < quality.leafCount; index += 1) {
        const sourceIndex = Math.min(sourceLeaves.length - 1, Math.floor(index * step));
        sampledLeaves.push(sourceLeaves[sourceIndex]);
      }
    }

    if (quotes.length === 0) {
      return sampledLeaves.map((leaf) => ({ leaf, quote: null }));
    }

    const order = Array.from({ length: quotes.length }, (_, index) => index);
    let seed = treeSeed + sampledLeaves.length * 131;
    const nextRandom = () => {
      seed = (Math.imul(1664525, seed) + 1013904223) | 0;
      return (seed >>> 0) / 4294967296;
    };

    for (let index = order.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(nextRandom() * (index + 1));
      const current = order[index];
      order[index] = order[swapIndex];
      order[swapIndex] = current;
    }

    return sampledLeaves.map((leaf, index) => ({
      leaf,
      quote: quotes[order[index % order.length]] ?? null,
    }));
  }, [quality.leafCount, quotes, treeData.leaves, treeSeed]);

  const leafNodes = useMemo(() => leafBindings.map((item) => item.leaf), [leafBindings]);
  const leafQuoteIds = useMemo(() => leafBindings.map((item) => item.quote?.id ?? null), [leafBindings]);
  const quoteThemes = useMemo(() => leafBindings.map((item) => item.quote?.theme ?? null), [leafBindings]);

  const selectedIndex = useMemo(() => {
    if (selectedQuoteId) {
      const quoteIndex = leafBindings.findIndex((binding) => binding.quote?.id === selectedQuoteId);
      return quoteIndex === -1 ? null : quoteIndex;
    }

    if (manualSelectedIndex === null) {
      return null;
    }

    return manualSelectedIndex < leafBindings.length ? manualSelectedIndex : null;
  }, [leafBindings, manualSelectedIndex, selectedQuoteId]);

  const selectedLeaf = useMemo(() => {
    if (selectedIndex === null) {
      return null;
    }

    return leafBindings[selectedIndex]?.leaf ?? null;
  }, [leafBindings, selectedIndex]);

  const selectionLightPosition = useMemo<[number, number, number]>(() => {
    if (!selectedLeaf) {
      return [0, 3.2, 1.8];
    }

    return [selectedLeaf.position.x, selectedLeaf.position.y + 0.2, selectedLeaf.position.z + 0.16];
  }, [selectedLeaf]);

  useEffect(() => {
    onSceneReady();
  }, [onSceneReady]);

  const handleSelect = useCallback(
    (index: number) => {
      setManualSelectedIndex(index);
      const selectedQuote = leafBindings[index]?.quote;
      if (!selectedQuote) {
        return;
      }

      onLeafQuoteSelect(selectedQuote);
    },
    [leafBindings, onLeafQuoteSelect],
  );

  const handleHover = useCallback(
    (index: number | null) => {
      setHoveredIndex(index);
      onLeafHoverStateChange(index !== null);
    },
    [onLeafHoverStateChange],
  );

  useFrame(({ pointer }) => {
    if (!treeRef.current) {
      return;
    }

    const motionFactor = reduceMotion ? 0.35 : 1;
    const focusDamping = selectedLeaf ? 0.5 : 1;
    treeRef.current.rotation.y = THREE.MathUtils.lerp(
      treeRef.current.rotation.y,
      pointer.x * 0.08 * motionFactor * focusDamping,
      0.02,
    );
    treeRef.current.rotation.x = THREE.MathUtils.lerp(
      treeRef.current.rotation.x,
      pointer.y * 0.02 * motionFactor * focusDamping,
      0.03,
    );

    if (controlsRef.current) {
      controlsRef.current.autoRotate = false;
      controlsRef.current.update();
    }

    if (treeRef.current) {
      const targetScale = introActive ? 0.22 : 1;
      const nextScale = THREE.MathUtils.lerp(treeRef.current.scale.x, targetScale, introActive ? 0.12 : 0.06);
      treeRef.current.scale.setScalar(nextScale);

      const targetY = introActive ? -1.9 : -1.2;
      treeRef.current.position.y = THREE.MathUtils.lerp(treeRef.current.position.y, targetY, introActive ? 0.12 : 0.07);
    }
  });

  const tutorialNodes = useMemo(() => {
    if (!showTutorialMarkers) {
      return [] as Array<{ key: string; position: [number, number, number] }>;
    }

    const picks = [6, Math.floor(leafNodes.length * 0.34), Math.floor(leafNodes.length * 0.68)].filter(
      (index) => index >= 0 && index < leafNodes.length,
    );

    return picks.map((index) => {
      const leaf = leafNodes[index];
      return {
        key: `tutorial-${index}`,
        position: [leaf.position.x, leaf.position.y + 0.08, leaf.position.z] as [number, number, number],
      };
    });
  }, [leafNodes, showTutorialMarkers]);

  return (
    <>
      <color attach="background" args={["#A2CBE3"]} />
      <fog attach="fog" args={["#A2CBE3", 15, 45]} />

      {/* O Sol Global - Céu Realista */}
      {quality.profile !== "safe" && !reduceMotion && !isMobile ? (
        <Sky
          distance={450000}
          sunPosition={[8, 12, 6]}
          inclination={0.45} // Elevação do sol (um final de tarde)
          azimuth={0.25}     // Ângulo horizontal
        />
      ) : null}

      {/* 1. Iluminação Global (Preenche as sombras com um tom azulado calmo) */}
      <ambientLight intensity={1.2} color="#DCE8F5" />
      <hemisphereLight intensity={1.5} color="#87A6C6" groundColor="#2A3B22" />

      {/* 2. O Sol Artificial (Luz principal, quente e direcional) */}
      <directionalLight
        position={[8, 12, 6]} // Sol posicionado alto e à direita
        intensity={3.5}       // Força exata para não cegar a tela, mas ativar a translucidez
        color="#FFDFB0"       // Tom dourado
        castShadow={quality.profile !== "safe"}
        shadow-mapSize={quality.profile === "safe" ? [1024, 1024] : [2048, 2048]}
        shadow-camera-left={-8}
        shadow-camera-right={8}
        shadow-camera-top={8}
        shadow-camera-bottom={-8}
        shadow-bias={-0.0005}
        shadow-radius={4}     // Sombras suaves no gramado
      />
      
      {/* 3. Luz de Preenchimento (Para o lado esquerdo da árvore não ficar escuro) */}
      <directionalLight position={[-6, 6, -4]} intensity={1.5} color="#9FB4C8" />

      <pointLight
        position={selectionLightPosition}
        intensity={selectedLeaf ? 4 : 0}
        color="#FFE5B4"
        distance={3}
        decay={2}
      />

      <group ref={treeRef} position={[0, -1.2, 0]}>
        <TreeTrunk trunk={treeData.trunk} roots={treeData.roots} qualityProfile={quality.profile} />
        <BranchInstances branches={treeData.branches} qualityProfile={quality.profile} />
        <LeafInstances
          leaves={leafNodes}
          quoteIds={leafQuoteIds}
          quoteThemes={quoteThemes}
          favoriteQuoteIds={favoriteQuoteIds}
          activeTheme={activeTheme}
          reduceMotion={reduceMotion}
          focusActive={selectedLeaf !== null}
          updateDivisor={quality.profile === "safe" ? 3 : quality.profile === "medium" ? 2 : 1}
          hoveredIndex={hoveredIndex}
          selectedIndex={selectedIndex}
          onHover={handleHover}
          onSelect={handleSelect}
        />
      </group>

      {tutorialNodes.map((node) => (
        <mesh key={node.key} position={node.position}>
          <sphereGeometry args={[0.024, 10, 10]} />
          <meshBasicMaterial color="#F7DCA2" transparent opacity={0.75} />
        </mesh>
      ))}

      <GroundTerrain />

      {selectedLeaf && quality.profile !== "safe" && !reduceMotion ? (
        <EffectComposer multisampling={0}>
          <DepthOfField focusDistance={0.02} focalLength={0.02} bokehScale={0.9} height={420} />
        </EffectComposer>
      ) : null}

      <OrbitControls
        ref={controlsRef}
        enablePan={!isMobile}
        enableZoom={!isMobile}
        enableRotate={true}
        enableDamping
        dampingFactor={reduceMotion ? 0.05 : 0.08}
        target={[0, 1.5, 0]}
        rotateSpeed={isMobile ? 0.5 : 0.8}
      />

      <PerformanceObserver profile={quality.profile} onSuggestProfile={onSuggestProfile} />
    </>
  );
}

export default function TreeScene({
  quotes,
  favoriteQuoteIds,
  qualityProfile,
  activeTheme,
  selectedQuoteId,
  sessionSeedKey,
  treeSeedBump,
  introActive,
  isMobile,
  reduceMotion,
  showTutorialMarkers,
  onSuggestProfile,
  onLeafQuoteSelect,
  onLeafHoverStateChange,
  onSceneReady,
}: TreeSceneProps) {
  const quality = SCENE_QUALITY_CONFIGS[qualityProfile];
  const resolvedDpr = isMobile ? Math.min(quality.dpr, quality.profile === "safe" ? 1 : 1.2) : quality.dpr;

  return (
    <Canvas
      shadows={quality.profile === "safe" ? false : { type: THREE.PCFSoftShadowMap }}
      camera={{ position: [0, 1.2, 7.5], fov: 35 }}
      dpr={[1, resolvedDpr]}
      gl={{
        antialias: quality.profile !== "safe" && !isMobile,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: reduceMotion ? 0.72 : 0.75,
      }}
    >
      <Suspense fallback={null}>
        <SceneContent
          quality={quality}
          quotes={quotes}
          favoriteQuoteIds={favoriteQuoteIds}
          activeTheme={activeTheme}
          selectedQuoteId={selectedQuoteId}
          sessionSeedKey={sessionSeedKey}
          treeSeedBump={treeSeedBump}
          introActive={introActive}
          isMobile={isMobile}
          reduceMotion={reduceMotion}
          showTutorialMarkers={showTutorialMarkers}
          onLeafQuoteSelect={onLeafQuoteSelect}
          onLeafHoverStateChange={onLeafHoverStateChange}
          onSceneReady={onSceneReady}
          onSuggestProfile={onSuggestProfile}
        />
      </Suspense>
    </Canvas>
  );
}
