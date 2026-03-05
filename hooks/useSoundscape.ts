"use client";

import { useCallback, useEffect } from "react";

import { soundscape } from "@/lib/audio/soundscape";

export function useSoundscape(enabled = true) {
  useEffect(() => {
    if (!enabled) {
      return;
    }

    const unlockAmbient = () => {
      soundscape.startAmbient();
      window.removeEventListener("pointerdown", unlockAmbient);
      window.removeEventListener("keydown", unlockAmbient);
    };

    window.addEventListener("pointerdown", unlockAmbient, { once: true });
    window.addEventListener("keydown", unlockAmbient, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlockAmbient);
      window.removeEventListener("keydown", unlockAmbient);
    };
  }, [enabled]);

  const playHover = useCallback(() => {
    if (!enabled) return;
    soundscape.play("hover");
  }, [enabled]);

  const playRandom = useCallback(() => {
    if (!enabled) return;
    soundscape.play("random");
  }, [enabled]);

  const playFavorite = useCallback(() => {
    if (!enabled) return;
    soundscape.play("favorite");
  }, [enabled]);

  return { playHover, playRandom, playFavorite };
}
