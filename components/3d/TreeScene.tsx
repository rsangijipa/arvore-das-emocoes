"use client";

import { OrbitControls } from "@react-three/drei";
import { Canvas, useFrame } from "@react-three/fiber";
import { Bloom, DepthOfField, EffectComposer, Vignette } from "@react-three/postprocessing";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import * as THREE from "three";

import { BranchInstances } from "@/components/3d/BranchInstances";
import { FloatingParticles } from "@/components/3d/FloatingParticles";
import { LeafInstances } from "@/components/3d/LeafInstances";
import { TreeTrunk } from "@/components/3d/TreeTrunk";
import {
  SCENE_LIGHTING_PRESETS,
  SCENE_QUALITY_CONFIGS,
  getCuratedTreeSeed,
  getSceneMoodPreset,
  type SceneMood,
  vec3Token,
} from "@/lib/theme/scene-tokens";
import { generateFractalTree, type LeafNode } from "@/lib/tree/generateTree";
import type { QualityConfig, QualityProfile } from "@/types/performance";
import type { Quote, ThemeFilter } from "@/types/quote";

type TreeSceneProps = {
  quotes: Quote[];
  qualityProfile: QualityProfile;
  selectedQuoteId: string | null;
  sceneMood: SceneMood;
  sessionSeedKey: string | null;
  activeTheme: ThemeFilter;
  reduceMotion: boolean;
  introActive: boolean;
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
  const frameCount = useRef(0);
  const lastCheck = useRef(0);
  const cooldownUntil = useRef(0);

  useFrame(({ clock }) => {
    frameCount.current += 1;
    const elapsed = clock.elapsedTime;

    if (lastCheck.current === 0) {
      lastCheck.current = elapsed;
      return;
    }

    const delta = elapsed - lastCheck.current;
    if (delta < 2.5) {
      return;
    }

    const fps = frameCount.current / delta;
    frameCount.current = 0;
    lastCheck.current = elapsed;

    if (elapsed < cooldownUntil.current) {
      return;
    }

    if (profile === "high" && fps < 34) {
      onSuggestProfile("medium");
      cooldownUntil.current = elapsed + 4;
      return;
    }

    if (profile === "medium" && fps < 27) {
      onSuggestProfile("safe");
      cooldownUntil.current = elapsed + 4;
    }
  });

  return null;
}

function AtmosphereBackdrop({ mood }: { mood: SceneMood }) {
  const moodPreset = getSceneMoodPreset(mood);
  const topColor = vec3Token(moodPreset.sky.top);
  const middleColor = vec3Token(moodPreset.sky.middle);
  const horizonColor = vec3Token(moodPreset.sky.horizon);
  const baseColor = vec3Token(moodPreset.sky.base);
  const moodAtmosphere =
    mood === "dawn"
      ? {
          baseMute: "vec3(0.79, 0.79, 0.82)",
          horizonMute: "vec3(0.82, 0.83, 0.88)",
          horizonFloor: 0.74,
          warmBandTint: "vec3(0.055, 0.035, 0.022)",
          centerGlowTint: "vec3(0.04, 0.026, 0.015)",
          centerGlowPower: 0.17,
          vignetteMin: 0.86,
          vignetteMax: 1.03,
        }
      : mood === "night-calm"
        ? {
            baseMute: "vec3(0.65, 0.68, 0.76)",
            horizonMute: "vec3(0.68, 0.73, 0.82)",
            horizonFloor: 0.66,
            warmBandTint: "vec3(0.015, 0.012, 0.014)",
            centerGlowTint: "vec3(0.015, 0.018, 0.028)",
            centerGlowPower: 0.09,
            vignetteMin: 0.8,
            vignetteMax: 1.01,
          }
        : {
            baseMute: "vec3(0.75, 0.76, 0.78)",
            horizonMute: "vec3(0.78, 0.8, 0.84)",
            horizonFloor: 0.72,
            warmBandTint: "vec3(0.04, 0.025, 0.015)",
            centerGlowTint: "vec3(0.03, 0.02, 0.012)",
            centerGlowPower: 0.14,
            vignetteMin: 0.84,
            vignetteMax: 1.02,
          };

  return (
    <mesh position={[0, 6.4, -9]} scale={[42, 28, 42]} renderOrder={-10}>
      <sphereGeometry args={[1, 64, 48]} />
      <shaderMaterial
        side={THREE.BackSide}
        depthWrite={false}
        vertexShader={`
          varying vec3 vWorldPosition;

          void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPosition;
          }
        `}
        fragmentShader={`
          varying vec3 vWorldPosition;

          // Warm late afternoon atmospheric gradient
          vec3 topColor = ${topColor};
          vec3 middleColor = ${middleColor};
          vec3 horizonColor = ${horizonColor};
          vec3 baseColor = ${baseColor};

          void main() {
            float heightFactor = clamp((vWorldPosition.y + 10.0) / 20.0, 0.0, 1.0);

            vec3 mutedBase = baseColor * ${moodAtmosphere.baseMute};
            vec3 mutedHorizon = horizonColor * ${moodAtmosphere.horizonMute};

            vec3 color = mix(mutedBase, mutedHorizon, smoothstep(0.03, 0.18, heightFactor));
            color = mix(color, middleColor, smoothstep(0.16, 0.5, heightFactor));
            color = mix(color, topColor, smoothstep(0.46, 0.92, heightFactor));

            float horizonFade = smoothstep(0.0, 0.24, heightFactor);
            color *= mix(${moodAtmosphere.horizonFloor.toFixed(2)}, 1.0, horizonFade);

            float warmBand = smoothstep(0.08, 0.2, heightFactor) * (1.0 - smoothstep(0.24, 0.38, heightFactor));
            color += ${moodAtmosphere.warmBandTint} * warmBand;

            float centerGlow = 1.0 - smoothstep(2.5, 18.5, length(vec2(vWorldPosition.x * 0.85, vWorldPosition.y + 1.6)));
            color += ${moodAtmosphere.centerGlowTint} * centerGlow * ${moodAtmosphere.centerGlowPower.toFixed(2)};

            float vignette = smoothstep(24.0, 8.5, length(vWorldPosition.xz));
            color *= mix(${moodAtmosphere.vignetteMin.toFixed(2)}, ${moodAtmosphere.vignetteMax.toFixed(2)}, vignette);

            gl_FragColor = vec4(color, 1.0);
          }
        `}
      />
    </mesh>
  );
}

function GroundTerrain({ quality }: { quality: QualityConfig }) {
  const terrain = useMemo(() => {
    const geometry = new THREE.CircleGeometry(4.3, 96);
    const position = geometry.attributes.position;

    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i);
      const y = position.getY(i);
      const wave = Math.sin(x * 1.2) * 0.04 + Math.cos(y * 1.15) * 0.035;
      const micro = Math.sin((x + y) * 6.2) * 0.006;
      const distance = Math.sqrt(x * x + y * y);
      const radial = Math.max(0, 1 - distance / 4.6);
      const edgeDrop = THREE.MathUtils.smoothstep(distance, 3.6, 4.3);
      position.setZ(i, wave * radial + micro - edgeDrop * 0.09);
    }

    geometry.computeVertexNormals();
    return geometry;
  }, []);

  const stones = useMemo(() => {
    let seed = 70231 + quality.particleCount * 17;
    const random = () => {
      seed = (Math.imul(1664525, seed) + 1013904223) | 0;
      return (seed >>> 0) / 4294967296;
    };

    const count = Math.max(24, Math.floor(quality.particleCount * 0.7));
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    const positions: Array<{ matrix: THREE.Matrix4; color: THREE.Color }> = [];

    for (let i = 0; i < count; i += 1) {
      const angle = random() * Math.PI * 2;
      const radius = 0.7 + random() * 2.8;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = -0.58 + random() * 0.03;
      const scale = 0.02 + random() * 0.05;
      matrix.compose(
        new THREE.Vector3(x, y, z),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(random(), random(), random())),
        new THREE.Vector3(scale * 1.2, scale, scale * 0.9),
      );

      color.set("#4A3E34").lerp(new THREE.Color("#5B5246"), random() * 0.55);
      positions.push({ matrix: matrix.clone(), color: color.clone() });
    }

    return positions;
  }, [quality.particleCount]);

  const stoneRef = useRef<THREE.InstancedMesh>(null);
  const stoneGeometry = useMemo(() => new THREE.IcosahedronGeometry(1, 0), []);
  const stoneMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#ffffff",
        roughness: 0.9,
        metalness: 0.02,
        vertexColors: true,
      }),
    [],
  );

  useEffect(() => {
    return () => {
      terrain.dispose();
      stoneGeometry.dispose();
      stoneMaterial.dispose();
    };
  }, [stoneGeometry, stoneMaterial, terrain]);

  useEffect(() => {
    if (!stoneRef.current) {
      return;
    }

    stones.forEach((stone, index) => {
      stoneRef.current?.setMatrixAt(index, stone.matrix);
      stoneRef.current?.setColorAt(index, stone.color);
    });

    stoneRef.current.instanceMatrix.needsUpdate = true;
    if (stoneRef.current.instanceColor) {
      stoneRef.current.instanceColor.needsUpdate = true;
    }
  }, [stones]);

  return (
    <>
      <mesh position={[0, -0.62, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <primitive object={terrain} attach="geometry" />
        <meshStandardMaterial color="#3B2F29" roughness={0.97} metalness={0} />
      </mesh>

      <instancedMesh ref={stoneRef} args={[stoneGeometry, stoneMaterial, stones.length]} castShadow receiveShadow />

      <mesh position={[0, -0.535, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[4.95, 80]} />
        <shaderMaterial
          transparent
          depthWrite={false}
          blending={THREE.NormalBlending}
          vertexShader={`
            varying vec2 vUv;

            void main() {
              vUv = uv;
              gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
          `}
          fragmentShader={`
            varying vec2 vUv;

            void main() {
              float d = distance(vUv, vec2(0.5));
              float edge = smoothstep(0.34, 0.5, d) * (1.0 - smoothstep(0.5, 0.62, d));
              vec3 tint = vec3(0.78, 0.69, 0.57);
              gl_FragColor = vec4(tint, edge * 0.24);
            }
          `}
        />
      </mesh>
    </>
  );
}

function ScenePostEffects({ focused, reduceMotion }: { focused: boolean; reduceMotion: boolean }) {
  return (
    <EffectComposer multisampling={0}>
      <Bloom intensity={0.16} luminanceThreshold={0.88} luminanceSmoothing={0.35} mipmapBlur />
      <DepthOfField
        focusDistance={focused ? 0.03 : 0.027}
        focalLength={focused ? 0.05 : 0.036}
        bokehScale={focused ? 1.6 : 0.72}
        height={reduceMotion ? 360 : 480}
      />
      <Vignette eskil={false} offset={0.18} darkness={focused ? 0.36 : 0.29} />
    </EffectComposer>
  );
}

function SceneContent({
  quality,
  quotes,
  selectedQuoteId,
  sceneMood,
  sessionSeedKey,
  activeTheme,
  reduceMotion,
  introActive,
  showTutorialMarkers,
  onLeafQuoteSelect,
  onLeafHoverStateChange,
  onSceneReady,
  onSuggestProfile,
}: {
  quality: QualityConfig;
  quotes: Quote[];
  selectedQuoteId: string | null;
  sceneMood: SceneMood;
  sessionSeedKey: string | null;
  activeTheme: ThemeFilter;
  reduceMotion: boolean;
  introActive: boolean;
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
  const [isOrbiting, setIsOrbiting] = useState(false);
  const desiredTarget = useRef(new THREE.Vector3(0, 1.2, 0));
  const desiredDistance = useRef(7.5);
  const fromTargetRef = useRef(new THREE.Vector3());
  const desiredPositionRef = useRef(new THREE.Vector3());
  const lightPreset = SCENE_LIGHTING_PRESETS[quality.profile];
  const moodPreset = getSceneMoodPreset(sceneMood);
  const treeSeed = useMemo(() => getCuratedTreeSeed(quality.profile, sceneMood, sessionSeedKey), [quality.profile, sceneMood, sessionSeedKey]);

  const cameraPreset = useMemo(() => {
    return {
      baseTarget: new THREE.Vector3(0, 1.2, 0),
      baseDistance: 7.5,
      selectedDistance: 5.0,
    };
  }, []);

  const treeData = useMemo(
    () =>
      generateFractalTree({
        maxDepth: quality.branchDepth,
        baseLength: 1.85,
        trunkHeight: 2.15,
        initialRadius: 0.08,
        leafDensity: quality.profile === "safe" ? 1.95 : 2.45,
        leafTarget: quality.leafCount + (quality.profile === "high" ? 56 : quality.profile === "medium" ? 40 : 24),
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

    return sampledLeaves.map((leaf, index) => ({
      leaf,
      quote: quotes.length === 0 ? null : quotes[index % quotes.length],
    }));
  }, [quality.leafCount, quotes, treeData.leaves]);

  const leafNodes = useMemo(() => leafBindings.map((item) => item.leaf), [leafBindings]);
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

    return [
      selectedLeaf.position.x * 0.8,
      THREE.MathUtils.clamp(selectedLeaf.position.y + 0.8, 1.5, 5),
      selectedLeaf.position.z * 0.8,
    ];
  }, [selectedLeaf]);

  useEffect(() => {
    onSceneReady();
  }, [onSceneReady]);

  useEffect(() => {
    if (!selectedLeaf) {
      desiredTarget.current.copy(cameraPreset.baseTarget);
      desiredDistance.current = cameraPreset.baseDistance;
      return;
    }

    desiredTarget.current.set(
      selectedLeaf.position.x * 0.42,
      THREE.MathUtils.clamp(selectedLeaf.position.y + 0.38, 1.15, 3.15),
      selectedLeaf.position.z * 0.42,
    );
    desiredDistance.current = cameraPreset.selectedDistance;
  }, [cameraPreset, selectedLeaf]);

  const handleSelect = useCallback(
    (index: number) => {
      setManualSelectedIndex(index);
      const selectedQuote = leafBindings[index]?.quote;
      if (selectedQuote) {
        onLeafQuoteSelect(selectedQuote);
      }
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

  useFrame(({ pointer, camera }) => {
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

    if (!controlsRef.current) {
      return;
    }

    const controls = controlsRef.current;
    const targetLerp = reduceMotion ? 0.2 : selectedLeaf ? 0.11 : 0.075;
    const cameraLerp = reduceMotion ? 0.2 : selectedLeaf ? 0.12 : 0.085;
    controls.target.lerp(desiredTarget.current, targetLerp);

    const fromTarget = fromTargetRef.current.copy(camera.position).sub(controls.target);
    if (fromTarget.lengthSq() < 0.0001) {
      fromTarget.set(0.2, 0.08, 1);
    }

    const desiredPosition = desiredPositionRef.current.copy(desiredTarget.current).add(fromTarget.normalize().multiplyScalar(desiredDistance.current));

    if (selectedLeaf) {
      desiredPosition.y += 0.14;
    }

    camera.position.lerp(desiredPosition, cameraLerp);

    controls.autoRotate = !reduceMotion && !selectedLeaf && !isOrbiting;
    controls.autoRotateSpeed = 0.14;
    controls.update();

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
      <color attach="background" args={[moodPreset.sky.background]} />
      <AtmosphereBackdrop mood={sceneMood} />

      {/* Block 5 - Lighting Setup */}
      <ambientLight intensity={lightPreset.ambient * 0.74} color="#A7B8C9" />
      <hemisphereLight intensity={lightPreset.hemi * 1.05} color="#9FB4C8" groundColor="#2D241E" />
      <directionalLight
        position={[4.6, 5.8, 3.2]}
        intensity={lightPreset.key * 0.82}
        color="#F4C98B"
        castShadow
        shadow-mapSize={[lightPreset.shadowMap, lightPreset.shadowMap]}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-6}
        shadow-bias={-0.00012}
        shadow-normalBias={0.03}
      />
      <directionalLight position={[-4.6, 2.8, -2.4]} intensity={lightPreset.fill * 0.75} color="#7FA5C7" />
      <directionalLight position={[-1.8, 3.4, 4.3]} intensity={lightPreset.rim * 0.68} color="#CFE2F0" />
      <directionalLight position={[0, 2.4, -5]} intensity={0.2} color="#8DAEBC" />

      <pointLight
        position={selectionLightPosition}
        intensity={selectedLeaf ? lightPreset.selection * 0.84 : 0.12}
        color="#F7D7A3"
        distance={selectedLeaf ? 5.4 : 4.2}
        decay={2}
      />

      <group ref={treeRef} position={[0, -1.2, 0]}>
        <TreeTrunk trunk={treeData.trunk} roots={treeData.roots} />
        <BranchInstances branches={treeData.branches} />
        <LeafInstances
          leaves={leafNodes}
          quoteThemes={quoteThemes}
          activeTheme={activeTheme}
          reduceMotion={reduceMotion}
          focusActive={selectedLeaf !== null}
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

      <GroundTerrain quality={quality} />

      <mesh position={[0, -0.53, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <circleGeometry args={[4.5, 64]} />
        <shadowMaterial opacity={0.12} />
      </mesh>

      <FloatingParticles count={quality.particleCount} reduceMotion={reduceMotion} emphasis={selectedLeaf !== null} />

      <ScenePostEffects focused={selectedLeaf !== null} reduceMotion={reduceMotion} />

      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableZoom={true}
        enableDamping
        dampingFactor={0.08}
        minDistance={3.2}
        maxDistance={10.8}
        minPolarAngle={Math.PI * 0.24}
        maxPolarAngle={Math.PI * 0.74}
        minAzimuthAngle={-1.05}
        maxAzimuthAngle={1.05}
        target={[0, 1.2, 0]}
        onStart={() => setIsOrbiting(true)}
        onEnd={() => setIsOrbiting(false)}
      />

      <PerformanceObserver profile={quality.profile} onSuggestProfile={onSuggestProfile} />
    </>
  );
}

export default function TreeScene({
  quotes,
  qualityProfile,
  selectedQuoteId,
  sceneMood,
  sessionSeedKey,
  activeTheme,
  reduceMotion,
  introActive,
  showTutorialMarkers,
  onSuggestProfile,
  onLeafQuoteSelect,
  onLeafHoverStateChange,
  onSceneReady,
}: TreeSceneProps) {
  const quality = SCENE_QUALITY_CONFIGS[qualityProfile];
  const moodPreset = getSceneMoodPreset(sceneMood);

  return (
    <Canvas
      shadows
      camera={{ position: [0, 1.2, 7.2], fov: 35 }}
      dpr={[1, quality.dpr]}
      gl={{ antialias: quality.profile !== "safe", powerPreference: "high-performance", toneMappingExposure: moodPreset.exposure }}
    >
      <Suspense fallback={null}>
        <SceneContent
          quality={quality}
          quotes={quotes}
          selectedQuoteId={selectedQuoteId}
          sceneMood={sceneMood}
          sessionSeedKey={sessionSeedKey}
          activeTheme={activeTheme}
          reduceMotion={reduceMotion}
          introActive={introActive}
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
