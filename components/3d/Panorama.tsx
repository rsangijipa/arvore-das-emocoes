"use client";

import { useEffect, useState } from "react";
import * as THREE from "three";

import { HORIZON_COLOR, loadPanoramaTexture } from "@/lib/theme/panorama";

type PanoramaProps = {
  resolution: 1024 | 2048;
};

/**
 * Fundo 360 graus da cena.
 *
 * Usar `attach="background"` (em vez de escrever em `scene.background` dentro de
 * um efeito) mantem a atribuicao declarativa: o R3F desfaz sozinho na
 * desmontagem e nao ha mutacao de objeto vindo do store.
 *
 * O panorama vive no infinito: gira com a camera, nunca entra no frustum de
 * sombra e nao aparece no raycast.
 */
export function Panorama({ resolution }: PanoramaProps) {
  const [texture, setTexture] = useState<THREE.Texture | null>(null);

  useEffect(() => {
    let cancelled = false;
    let loaded: THREE.Texture | null = null;

    void loadPanoramaTexture(resolution)
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
  }, [resolution]);

  // cor solida enquanto a imagem nao chega, para nao piscar preto
  if (!texture) {
    return <color attach="background" args={[HORIZON_COLOR]} />;
  }

  return <primitive object={texture} attach="background" />;
}
