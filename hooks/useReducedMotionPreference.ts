"use client";

import { useEffect, useState } from "react";

export function useReducedMotionPreference() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const syncPreference = () => setReduceMotion(media.matches);

    syncPreference();
    media.addEventListener("change", syncPreference);

    return () => {
      media.removeEventListener("change", syncPreference);
    };
  }, []);

  return reduceMotion;
}
