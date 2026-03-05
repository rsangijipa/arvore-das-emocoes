"use client";

import { useCallback, useEffect } from "react";

import { soundscape } from "@/lib/audio/soundscape";

export function useSoundscape(enabled = true) {
  const audioEnabled = enabled && process.env.NEXT_PUBLIC_ENABLE_AUDIO === "1";

  useEffect(() => {
    if (!audioEnabled) {
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
  }, [audioEnabled]);

  const playHover = useCallback(() => {
    if (!audioEnabled) return;
    soundscape.play("hover");
  }, [audioEnabled]);

  const playClick = useCallback(() => {
    if (!audioEnabled) return;
    soundscape.play("click");
  }, [audioEnabled]);

  const playRandom = useCallback(() => {
    if (!audioEnabled) return;
    soundscape.play("random");
  }, [audioEnabled]);

  const playFavorite = useCallback(() => {
    if (!audioEnabled) return;
    soundscape.play("favorite");
  }, [audioEnabled]);

  return { playHover, playClick, playRandom, playFavorite };
}
