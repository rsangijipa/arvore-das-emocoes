import * as THREE from "three";

/**
 * Geometrias proceduais de pedras e arbustos para preencher o entorno da
 * arvore. Mesclagem manual de arrays (mesmo padrao de lib/tree/barkGeometry.ts),
 * sem depender de BufferGeometryUtils.
 */

const ROCK_DARK = new THREE.Color("#4B473F");
const ROCK_MID = new THREE.Color("#6E685B");
const ROCK_LIGHT = new THREE.Color("#8C8474");
const ROCK_MOSS = new THREE.Color("#4F5A34");

const BUSH_DEEP = new THREE.Color("#31531F");
const BUSH_MID = new THREE.Color("#4C7A2E");
const BUSH_LIGHT = new THREE.Color("#7BAD46");

function createRng(seed: number) {
  let state = (seed | 0) || 1;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) | 0;
    return (state >>> 0) / 4294967296;
  };
}

/** pedra unica: icosaedro com jitter por vertice + achatamento vertical */
export function buildRockGeometry(seed: number): THREE.BufferGeometry {
  const random = createRng(seed);
  const base = new THREE.IcosahedronGeometry(1, 1);
  const position = base.attributes.position;
  const colors = new Float32Array(position.count * 3);
  const color = new THREE.Color();
  const flatten = 0.62 + random() * 0.16;

  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);

    const jitter = 1 + (random() - 0.5) * 0.34;
    const nx = x * jitter;
    const ny = y * jitter * flatten;
    const nz = z * jitter;

    position.setXYZ(i, nx, ny, nz);

    const heightMix = THREE.MathUtils.clamp(ny / flatten * 0.5 + 0.5, 0, 1);
    color.copy(ROCK_DARK).lerp(ROCK_MID, heightMix);
    color.lerp(ROCK_LIGHT, Math.max(0, heightMix - 0.65) * 1.6);
    if (ny < -0.15 && random() < 0.4) {
      color.lerp(ROCK_MOSS, 0.35 + random() * 0.3);
    }

    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;
  }

  base.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  base.computeVertexNormals();
  base.computeBoundingSphere();
  return base;
}

/** arbusto: 4-6 lobos esfericos mesclados numa unica geometria */
export function buildBushGeometry(seed: number): THREE.BufferGeometry {
  const random = createRng(seed);
  const lobeCount = 4 + Math.floor(random() * 3);

  const positions: number[] = [];
  const normals: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  const color = new THREE.Color();

  for (let lobe = 0; lobe < lobeCount; lobe += 1) {
    const radius = 0.32 + random() * 0.3;
    const angle = (lobe / lobeCount) * Math.PI * 2 + random() * 0.5;
    const dist = lobe === 0 ? 0 : 0.22 + random() * 0.22;
    const offsetX = Math.cos(angle) * dist;
    const offsetZ = Math.sin(angle) * dist;
    const offsetY = radius * (0.55 + random() * 0.35);

    const sphere = new THREE.IcosahedronGeometry(radius, 1);
    const spherePos = sphere.attributes.position;
    const vertexOffset = positions.length / 3;

    for (let i = 0; i < spherePos.count; i += 1) {
      const x = spherePos.getX(i) + offsetX;
      const y = spherePos.getY(i) * 0.86 + offsetY;
      const z = spherePos.getZ(i) + offsetZ;

      positions.push(x, y, z);

      const n = new THREE.Vector3(spherePos.getX(i), spherePos.getY(i), spherePos.getZ(i)).normalize();
      normals.push(n.x, n.y, n.z);

      const heightMix = THREE.MathUtils.clamp(y / (offsetY + radius), 0, 1);
      color.copy(BUSH_DEEP).lerp(BUSH_MID, heightMix);
      color.lerp(BUSH_LIGHT, Math.max(0, heightMix - 0.6) * (0.4 + random() * 0.5));
      colors.push(color.r, color.g, color.b);
    }

    const sphereIndex = sphere.getIndex();
    if (sphereIndex) {
      for (let i = 0; i < sphereIndex.count; i += 1) {
        indices.push(vertexOffset + sphereIndex.getX(i));
      }
    }

    sphere.dispose();
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}
