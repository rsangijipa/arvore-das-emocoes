import * as THREE from "three";

/**
 * Material de folha.
 *
 * Duas coisas importantes acontecem aqui:
 *
 * 1. VENTO NA GPU. A copa tem centenas de folhas; animar matriz por matriz na CPU
 *    (setMatrixAt em todo frame) era o maior custo da cena. Aqui o balanco vive no
 *    vertex shader, ancorado no peciolo (y = 0), com fase por instancia.
 *
 * 2. TRANSLUCIDEZ BARATA. Folha real acende quando a luz vem por tras. Em vez de
 *    `transmission` (que forca um render pass extra por frame), usamos um termo de
 *    back-scatter analitico: custa alguns ALUs e da o mesmo efeito.
 */

export type LeafMaterialUniforms = {
  uTime: { value: number };
  uWind: { value: number };
  uWindSpeed: { value: number };
  uSunDirView: { value: THREE.Vector3 };
  uSubColor: { value: THREE.Color };
  uSubIntensity: { value: number };
  uLeafLength: { value: number };
};

export type LeafMaterialResult = {
  material: THREE.MeshStandardMaterial;
  uniforms: LeafMaterialUniforms;
};

export function createLeafMaterial(options: {
  color: THREE.ColorRepresentation;
  subsurfaceColor: THREE.ColorRepresentation;
  subsurfaceIntensity: number;
  roughness: number;
  vertexColors: boolean;
  windStrength: number;
  cacheKey: string;
  emissive?: THREE.ColorRepresentation;
  emissiveIntensity?: number;
}): LeafMaterialResult {
  const material = new THREE.MeshStandardMaterial({
    color: options.color,
    roughness: options.roughness,
    metalness: 0,
    side: THREE.DoubleSide,
    vertexColors: options.vertexColors,
    emissive: new THREE.Color(options.emissive ?? "#000000"),
    emissiveIntensity: options.emissiveIntensity ?? 1,
  });

  // com DoubleSide o shadow map tambem sai dos dois lados e a folha sombreia a
  // si mesma; renderizar so a face frontal na sombra elimina o acne
  material.shadowSide = THREE.FrontSide;

  const uniforms: LeafMaterialUniforms = {
    uTime: { value: 0 },
    uWind: { value: options.windStrength },
    uWindSpeed: { value: 1 },
    uSunDirView: { value: new THREE.Vector3(0, -1, 0) },
    uSubColor: { value: new THREE.Color(options.subsurfaceColor) },
    uSubIntensity: { value: options.subsurfaceIntensity },
    uLeafLength: { value: 0.34 },
  };

  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);

    shader.vertexShader = shader.vertexShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform float uTime;
        uniform float uWind;
        uniform float uWindSpeed;
        uniform float uLeafLength;
        #ifdef USE_INSTANCING
          attribute float aPhase;
          attribute float aStiffness;
        #endif`,
      )
      .replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          float leafPhase = aPhase;
          float leafStiffness = aStiffness;
        #else
          float leafPhase = 0.0;
          float leafStiffness = 1.0;
        #endif

        // quanto mais longe do peciolo, mais a folha balanca
        float windSpan = clamp(transformed.y / uLeafLength, 0.0, 1.6);
        float windAmount = uWind * pow(windSpan, 1.7) * leafStiffness;

        float t = uTime * uWindSpeed;
        float gust = 0.65 + 0.35 * sin(t * 0.23 + leafPhase * 0.31);
        float sway = sin(t * 1.35 + leafPhase) + 0.45 * sin(t * 3.1 + leafPhase * 2.3);
        float flutter = cos(t * 2.4 + leafPhase * 1.7);

        transformed.x += sway * windAmount * gust;
        transformed.z += flutter * windAmount * 0.7 * gust;
        transformed.y -= abs(sway) * windAmount * 0.18;`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>
        uniform vec3 uSunDirView;
        uniform vec3 uSubColor;
        uniform float uSubIntensity;`,
      )
      .replace(
        "#include <opaque_fragment>",
        `// translucidez: a folha acende quando a luz vem por tras
        vec3 viewDirLeaf = normalize(vViewPosition);
        float backLight = pow(clamp(dot(viewDirLeaf, uSunDirView), 0.0, 1.0), 3.0);
        float shadedSide = 1.0 - clamp(dot(normal, -uSunDirView), 0.0, 1.0);
        outgoingLight += uSubColor * backLight * (0.3 + 0.7 * shadedSide) * uSubIntensity;

        #include <opaque_fragment>`,
      );
  };

  material.customProgramCacheKey = () => options.cacheKey;

  return { material, uniforms };
}

/** direcao do sol em espaco de view, usada pelo termo de translucidez */
export function updateSunDirection(
  target: THREE.Vector3,
  sunWorldPosition: THREE.Vector3,
  camera: THREE.Camera,
) {
  // direcao que a luz percorre: do sol para a arvore
  target.copy(sunWorldPosition).normalize().negate();
  target.transformDirection(camera.matrixWorldInverse).normalize();
}
