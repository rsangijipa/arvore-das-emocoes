"use client";

import { useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

type FloatingParticlesProps = {
  count: number;
  reduceMotion: boolean;
  emphasis: boolean;
};

function hash01(seed: number) {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

function random01(seed: number) {
  return hash01(seed);
}

export function FloatingParticles({ count, reduceMotion, emphasis }: FloatingParticlesProps) {
  const pointsRef = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3);
    const anchors = new Float32Array(count * 3);
    const phases = new Float32Array(count);
    const speeds = new Float32Array(count);
    const drifts = new Float32Array(count);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);
    const tones = new Float32Array(count);

    for (let index = 0; index < count; index += 1) {
      const baseSeed = index * 4.173;
      const r1 = random01(baseSeed + 0.13);
      const r2 = random01(baseSeed + 0.37);
      const r3 = random01(baseSeed + 0.61);
      const r4 = random01(baseSeed + 0.79);
      const r5 = random01(baseSeed + 0.97);
      const r6 = random01(baseSeed + 1.23);
      const r7 = random01(baseSeed + 1.57);
      const r8 = random01(baseSeed + 1.81);

      const theta = r1 * Math.PI * 2;
      const radius = r2 < 0.78 ? Math.pow(r3, 0.6) * 4.4 : 4.7 + r4 * 2.7;

      const x = Math.cos(theta) * radius + (r5 - 0.5) * 0.55;
      const z = Math.sin(theta) * radius + (r6 - 0.5) * 0.55;
      let y = r7 * 6.8 - 0.45;
      if (r8 < 0.35) {
        y = random01(baseSeed + 2.03) * 2.1 - 0.25;
      }

      positions[index * 3] = x;
      positions[index * 3 + 1] = y;
      positions[index * 3 + 2] = z;

      anchors[index * 3] = x;
      anchors[index * 3 + 1] = y;
      anchors[index * 3 + 2] = z;

      phases[index] = random01(baseSeed + 2.37) * Math.PI * 2;
      speeds[index] = 0.15 + random01(baseSeed + 2.69) * 0.6; // Slower
      drifts[index] = 0.12 + random01(baseSeed + 2.97) * 0.3; // More floaty
      sizes[index] = 1.5 + random01(baseSeed + 3.23) * 3.5; // Partículas pequenas e delicadas
      alphas[index] = 0.15 + random01(baseSeed + 3.49) * 0.6; // Slightly more subtle
      tones[index] = random01(baseSeed + 3.83);
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute("anchor", new THREE.BufferAttribute(anchors, 3));
    particleGeometry.setAttribute("phase", new THREE.BufferAttribute(phases, 1));
    particleGeometry.setAttribute("speed", new THREE.BufferAttribute(speeds, 1));
    particleGeometry.setAttribute("drift", new THREE.BufferAttribute(drifts, 1));
    particleGeometry.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    particleGeometry.setAttribute("aAlpha", new THREE.BufferAttribute(alphas, 1));
    particleGeometry.setAttribute("aTone", new THREE.BufferAttribute(tones, 1));
    return particleGeometry;
  }, [count]);

  useFrame(({ clock }) => {
    if (!pointsRef.current) {
      return;
    }

    const elapsed = clock.elapsedTime;
    const motionFactor = reduceMotion ? 0.35 : 1;
    const positions = pointsRef.current.geometry.getAttribute("position") as THREE.BufferAttribute;
    const anchors = pointsRef.current.geometry.getAttribute("anchor") as THREE.BufferAttribute;
    const phases = pointsRef.current.geometry.getAttribute("phase") as THREE.BufferAttribute;
    const speeds = pointsRef.current.geometry.getAttribute("speed") as THREE.BufferAttribute;
    const drifts = pointsRef.current.geometry.getAttribute("drift") as THREE.BufferAttribute;

    for (let index = 0; index < count; index += 1) {
      const phase = phases.getX(index);
      const speed = speeds.getX(index);
      const drift = drifts.getX(index);
      const anchorX = anchors.getX(index);
      const anchorZ = anchors.getZ(index);

      let y = positions.getY(index) + (0.0011 + speed * 0.0014) * motionFactor;
      y += Math.sin(elapsed * 0.5 + phase) * 0.0008 * motionFactor;

      if (y > 7.5) {
        y = 1.0 + random01(index * 3.19 + Math.floor(elapsed * 0.7)) * 2.0;
      }

      const x = anchorX + Math.sin(elapsed * (0.2 + speed * 0.05) + phase) * drift * motionFactor;
      const z = anchorZ + Math.cos(elapsed * (0.17 + speed * 0.04) + phase * 1.2) * drift * 0.9 * motionFactor;

      positions.setXYZ(index, x, y, z);
    }

    const material = pointsRef.current.material as THREE.ShaderMaterial;
    const targetOpacity = emphasis ? 0.85 : 0.64;
    material.uniforms.uOpacity.value = THREE.MathUtils.lerp(material.uniforms.uOpacity.value, targetOpacity, 0.08);

    positions.needsUpdate = true;
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <shaderMaterial
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
        uniforms={{
          uOpacity: { value: 0.64 },
        }}
        vertexShader={`
          attribute float aSize;
          attribute float aAlpha;
          attribute float aTone;

          varying float vAlpha;
          varying float vTone;

          void main() {
            vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
            gl_Position = projectionMatrix * mvPosition;
            gl_PointSize = aSize * (80.0 / max(1.5, -mvPosition.z));
            vAlpha = aAlpha;
            vTone = aTone;
          }
        `}
        fragmentShader={`
          uniform float uOpacity;

          varying float vAlpha;
          varying float vTone;

          void main() {
            vec2 centered = gl_PointCoord - vec2(0.5);
            float distanceToCenter = length(centered);
            if (distanceToCenter > 0.5) discard;

            float softEdge = smoothstep(0.5, 0.1, distanceToCenter);
            float core = smoothstep(0.2, 0.0, distanceToCenter);

            vec3 warm = vec3(1.0, 0.9, 0.4);
            vec3 cool = vec3(0.6, 0.9, 0.4);
            vec3 color = mix(cool, warm, vTone);
            color += vec3(1.0) * core * 0.8;

            float alpha = softEdge * vAlpha * uOpacity;
            gl_FragColor = vec4(color, alpha);
          }
        `}
      />
    </points>
  );
}
