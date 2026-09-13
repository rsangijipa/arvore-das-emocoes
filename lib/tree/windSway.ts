import * as THREE from "three";

/**
 * Campo de vento compartilhado da arvore.
 *
 * Bark, folhas e halos leem a MESMA funcao analitica do espaco: quando o galho
 * entorta, a folha que nele mora entorta junto — nao ha emenda nem descolamento
 * entre casca e copa. O pendoao cresce com a altura (a base fica no chao) e a
 * rajada global acelera e afrouxa em ciclos longos, como vento de verdade.
 *
 * A contraparte em JavaScript (`windFieldAt`) e usada por quem vive fora do
 * vertex shader: os sprites de halo das folhas-mensagem.
 */

export const WIND_DIR = new THREE.Vector3(-1, 0, 0.34).normalize();

/** quantas vezes o balanco do galho amplifica a forca do vento da copa */
export const BRANCH_SWAY_GAIN = 4.2;

export const WIND_FIELD_GLSL = /* glsl */ `
uniform float uTime;
uniform float uSway;

vec3 windField(vec3 p) {
  float flex = pow(clamp(p.y / 6.0, 0.0, 1.0), 1.8);
  float phase = p.x * 0.4 + p.z * 0.55;
  float gust = 0.72 + 0.2 * sin(uTime * 0.41) + 0.08 * sin(uTime * 0.93 + 1.7);
  float s1 = sin(uTime * 1.15 + phase);
  float s2 = sin(uTime * 2.7 + phase * 1.6);
  vec3 dir = normalize(vec3(-1.0, 0.0, 0.34));
  vec3 disp = dir * (s1 * 0.72 + s2 * 0.28) * flex * uSway * gust;
  disp.y -= abs(s1) * flex * uSway * 0.12;
  return disp;
}
`;

function gustAt(time: number) {
  return 0.72 + 0.2 * Math.sin(time * 0.41) + 0.08 * Math.sin(time * 0.93 + 1.7);
}

/** mesma formula do GLSL, para objetos posicionados na CPU */
export function windFieldAt(
  x: number,
  y: number,
  z: number,
  time: number,
  sway: number,
  target: THREE.Vector3,
) {
  const flex = Math.pow(Math.min(1, Math.max(0, y / 6)), 1.8);
  const phase = x * 0.4 + z * 0.55;
  const gust = gustAt(time);
  const s1 = Math.sin(time * 1.15 + phase);
  const s2 = Math.sin(time * 2.7 + phase * 1.6);
  const along = (s1 * 0.72 + s2 * 0.28) * flex * sway * gust;

  target.set(WIND_DIR.x * along, -Math.abs(s1) * flex * sway * 0.12, WIND_DIR.z * along);
  return target;
}
