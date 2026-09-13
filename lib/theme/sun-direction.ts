import * as THREE from "three";

import { VIEW_HEIGHT, VIEW_WIDTH, getCelestialPixelPosition } from "@/lib/theme/panorama";
import type { SceneVariant } from "@/lib/theme/scene-variant";

/**
 * Converte a posicao (em pixels) do sol/lua desenhado no panorama equirretangular
 * para uma direcao 3D real no mundo, usando a mesma convencao de mapeamento
 * equirretangular que o three.js aplica ao textura de fundo
 * (`THREE.EquirectangularReflectionMapping`):
 *
 *   u = atan2(dir.z, dir.x) / (2*PI) + 0.5
 *   v = asin(dir.y) / PI + 0.5
 *
 * A textura e criada a partir de um canvas (linha 0 = topo da imagem) e o
 * `THREE.Texture` usa `flipY = true` por padrao, entao a coordenada v em
 * espaco GL e `1 - (pixelY / altura)`. Invertendo as formulas acima obtemos a
 * direcao real do astro no ceu, garantindo que a luz principal da cena venha
 * exatamente de onde o sol/lua aparece pintado no panorama.
 */
export function getSunDirection(variant: SceneVariant, target: THREE.Vector3 = new THREE.Vector3()): THREE.Vector3 {
  const pixel = getCelestialPixelPosition(variant);

  const u = pixel.x / VIEW_WIDTH;
  const vImage = pixel.y / VIEW_HEIGHT;
  const vGl = 1 - vImage;

  const elevation = (vGl - 0.5) * Math.PI; // -PI/2 (nadir) .. +PI/2 (zenite)
  const azimuth = (u - 0.5) * Math.PI * 2; // longitude ao redor do eixo Y

  const horizontal = Math.cos(elevation);
  target.set(horizontal * Math.cos(azimuth), Math.sin(elevation), horizontal * Math.sin(azimuth));

  return target.normalize();
}
