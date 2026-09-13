import * as THREE from "three";

/**
 * Microdetalhe procedural de casca (poros/fibras finas) via amostragem
 * triplanar, sem depender de texturas externas. Perturba normal e roughness
 * a partir de `vWorldPosition` + normal geometrica, com custo controlado por
 * `uMicroDetail` (0 desliga o efeito por completo).
 */

export const BARK_TRIPLANAR_GLSL = /* glsl */ `
uniform float uMicroDetail;

// hash/value noise 2D simples, sem texturas
float barkHash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float barkNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = barkHash(i);
  float b = barkHash(i + vec2(1.0, 0.0));
  float c = barkHash(i + vec2(0.0, 1.0));
  float d = barkHash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// duas escalas: fibra media (~40 unidades) e poro fino (~180 unidades)
float barkFiberPattern(vec2 uv) {
  float fiber = barkNoise(uv * 1.0) * 0.6 + barkNoise(uv * 2.3) * 0.4;
  // estica levemente na direcao vertical para ler como fibra, nao ruido isotropico
  return fiber;
}

vec3 barkTriplanarSample(vec3 worldPos, vec3 normal, float scaleMedium, float scalePore) {
  vec3 blendWeights = pow(abs(normal), vec3(4.0));
  blendWeights /= max(blendWeights.x + blendWeights.y + blendWeights.z, 1e-5);

  vec2 uvX = worldPos.yz;
  vec2 uvY = worldPos.xz;
  vec2 uvZ = worldPos.xy;

  float medium =
    barkFiberPattern(uvX * scaleMedium) * blendWeights.x +
    barkFiberPattern(uvY * scaleMedium) * blendWeights.y +
    barkFiberPattern(uvZ * scaleMedium) * blendWeights.z;

  float pore =
    barkFiberPattern(uvX * scalePore) * blendWeights.x +
    barkFiberPattern(uvY * scalePore) * blendWeights.y +
    barkFiberPattern(uvZ * scalePore) * blendWeights.z;

  return vec3(medium, pore, 0.0);
}
`;

export type CreateTreeBarkMaterialOptions = {
  detail: number;
};

/**
 * Cria o MeshStandardMaterial padrao da casca, com microdetalhe triplanar
 * injetado via onBeforeCompile. Chame `applyOnBeforeCompile` externamente
 * (ex: em TreeBark.tsx) para combinar com outros shaders (vento) na mesma
 * funcao onBeforeCompile.
 */
export function createTreeBarkMaterial({ detail }: CreateTreeBarkMaterialOptions) {
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.94,
    metalness: 0,
    flatShading: false,
  });

  const microDetailStrength = detail < 0.7 ? 0 : 1;

  const uniforms = {
    uMicroDetail: { value: microDetailStrength },
  };

  material.onBeforeCompile = (shader) => {
    applyBarkTriplanarToShader(shader, uniforms);
  };

  material.customProgramCacheKey = () => `tree-bark-triplanar-v1-${microDetailStrength}`;

  return { material, uniforms };
}

/**
 * Injeta a logica triplanar num `shader` (WebGLProgramParametersWithUniforms)
 * ja em processamento por outro onBeforeCompile — permite compor com o wind
 * shader mantendo uma unica funcao onBeforeCompile no material final.
 */
export function applyBarkTriplanarToShader(
  shader: THREE.WebGLProgramParametersWithUniforms,
  uniforms: { uMicroDetail: { value: number } },
) {
  Object.assign(shader.uniforms, uniforms);

  // vertex: expor vWorldPosition e vNormalW (normal geometrica em espaco mundo)
  shader.vertexShader = shader.vertexShader
    .replace(
      "#include <common>",
      `#include <common>
      varying vec3 vWorldPosition;
      varying vec3 vNormalW;`,
    )
    .replace(
      "#include <worldpos_vertex>",
      `#include <worldpos_vertex>
      vWorldPosition = worldPosition.xyz;
      vNormalW = normalize(mat3(modelMatrix) * objectNormal);`,
    );

  // fragment: declarar varyings + funcoes de ruido/triplanar
  shader.fragmentShader = shader.fragmentShader
    .replace(
      "#include <common>",
      `#include <common>
      varying vec3 vWorldPosition;
      varying vec3 vNormalW;
      ${BARK_TRIPLANAR_GLSL}`,
    )
    .replace(
      "#include <roughnessmap_fragment>",
      `#include <roughnessmap_fragment>
      #ifdef USE_ROUGHNESSMAP
      #endif
      if (uMicroDetail > 0.0) {
        vec3 barkSample = barkTriplanarSample(vWorldPosition, vNormalW, 1.0 / 40.0, 1.0 / 180.0);
        float poreRoughness = (barkSample.y - 0.5) * 0.18;
        roughnessFactor = clamp(roughnessFactor + poreRoughness * uMicroDetail, 0.05, 1.0);
      }`,
    )
    .replace(
      "#include <normal_fragment_maps>",
      `#include <normal_fragment_maps>
      if (uMicroDetail > 0.0) {
        vec3 barkSampleN = barkTriplanarSample(vWorldPosition, vNormalW, 1.0 / 40.0, 1.0 / 180.0);
        float fiberHeight = barkSampleN.x;
        float poreHeight = barkSampleN.y;
        // derivada por diferenca finita via fwidth para simular relevo fino sem sample extra
        float dHdx = dFdx(fiberHeight * 0.6 + poreHeight * 0.4);
        float dHdy = dFdy(fiberHeight * 0.6 + poreHeight * 0.4);
        vec3 microNormal = normalize(vec3(-dHdx, -dHdy, 1.0));
        float microStrength = 0.35 * uMicroDetail;
        normal = normalize(mix(normal, normalize(normal + microNormal * microStrength), microStrength));
      }`,
    );
}
