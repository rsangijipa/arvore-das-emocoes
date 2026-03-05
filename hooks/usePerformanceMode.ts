"use client";

import { useState } from "react";

import type { QualityProfile } from "@/types/performance";

function detectProfile(): QualityProfile {
  if (typeof navigator === "undefined") {
    return "medium";
  }

  const browserNavigator = navigator as Navigator & { deviceMemory?: number };
  const memory = browserNavigator.deviceMemory ?? 4;
  const cores = navigator.hardwareConcurrency ?? 4;

  if (memory <= 2 || cores <= 4) {
    return "safe";
  }

  if (memory >= 8 && cores >= 8) {
    return "high";
  }

  return "medium";
}

export function usePerformanceMode() {
  const [profile, setProfile] = useState<QualityProfile>(() => detectProfile());

  return { profile, setProfile };
}
