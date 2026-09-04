"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";

import { HORIZON_COLOR, loadPanoramaTexture } from "@/lib/theme/panorama";
import type { SceneVariant } from "@/lib/theme/scene-variant";

type PanoramaProps = {
  resolution: 1024 | 2048;
  sceneVariant: SceneVariant;
};

/**
 * Fundo 360 graus da cena.
 * Recebe `sceneVariant` para passar ao gerador SVG, que ajusta
 * o gradiente do céu de acordo com a hora do dia.
 */
export function Panorama({ resolution, sceneVariant }: PanoramaProps) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loaded: THREE.Texture | null = null;

    void loadPanoramaTexture(resolution, sceneVariant)
      .then((result) => {
        if (cancelled) {
          result.dispose();
          return;
        }
        loaded = result;
        setTexture(result);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      setTexture(null);
      loaded?.dispose();
    };
  }, [resolution, sceneVariant]);

  if (!texture) {
    return <color attach="background" args={[HORIZON_COLOR]} />;
  }

  return <primitive object={texture} attach="background" />;
}
