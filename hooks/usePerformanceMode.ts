"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

import type { QualityProfile } from "@/types/performance";

function detectProfile(): QualityProfile {
  const browserNavigator = navigator as Navigator & { deviceMemory?: number };
  const memory = browserNavigator.deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;

  if (memory <= 2 || cores <= 3) {
    return "safe";
  }

  if (memory >= 8 && cores >= 8 && !coarsePointer) {
    return "high";
  }

  return "medium";
}

/**
 * O snapshot precisa ser referencialmente estavel entre chamadas, senao o
 * useSyncExternalStore entra em loop de render. Como a capacidade do aparelho
 * nao muda durante a sessao, medimos uma vez e guardamos.
 */
let detected: QualityProfile | null = null;

function getClientSnapshot(): QualityProfile {
  if (detected === null) {
    detected = detectProfile();
  }
  return detected;
}

function getServerSnapshot(): QualityProfile {
  return "medium";
}

/** sem assinatura: o valor e medido uma vez e nunca muda sozinho */
function subscribe() {
  return () => {};
}

/**
 * Ler `navigator` no inicializador do useState produzia um valor no servidor e
 * outro no cliente (divergencia de hidratacao). `useSyncExternalStore` e a forma
 * idiomatica de expor um valor que so existe no cliente, sem setState em efeito.
 */
export function usePerformanceMode() {
  const detectedProfile = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  // rebaixamento manual (o observador de FPS pode sugerir um perfil menor)
  const [override, setOverride] = useState<QualityProfile | null>(null);

  const setProfile = useCallback((profile: QualityProfile) => {
    setOverride(profile);
  }, []);

  return { profile: override ?? detectedProfile, setProfile };
}
