"use client";

import { useCallback, useEffect, useState } from "react";

import { soundscape } from "@/lib/audio/soundscape";

const MUTE_STORAGE_KEY = "arvore:audio:muted";

export function useSoundscape(enabled = true) {
  const audioEnabled = enabled && process.env.NEXT_PUBLIC_ENABLE_AUDIO === "1";

  // lê a preferência de mute do localStorage (default: não mutado)
  const [muted, setMuted] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(MUTE_STORAGE_KEY) === "1";
  });

  useEffect(() => {
    if (!audioEnabled) {
      return;
    }

    const unlockAmbient = () => {
      if (!muted) {
        soundscape.startAmbient();
      }
      window.removeEventListener("pointerdown", unlockAmbient);
      window.removeEventListener("keydown", unlockAmbient);
    };

    window.addEventListener("pointerdown", unlockAmbient, { once: true });
    window.addEventListener("keydown", unlockAmbient, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlockAmbient);
      window.removeEventListener("keydown", unlockAmbient);
    };
  }, [audioEnabled, muted]);

  // sincroniza mute com o soundscape quando o estado muda
  useEffect(() => {
    if (!audioEnabled) return;
    if (muted) {
      soundscape.stopAll();
    }
  }, [audioEnabled, muted]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => {
      const next = !prev;
      window.localStorage.setItem(MUTE_STORAGE_KEY, next ? "1" : "0");
      if (!next) {
        // ao desmutar, reinicia o ambiente
        soundscape.startAmbient();
      } else {
        soundscape.stopAll();
      }
      return next;
    });
  }, []);

  const playHover = useCallback(() => {
    if (!audioEnabled || muted) return;
    soundscape.play("hover");
  }, [audioEnabled, muted]);

  const playClick = useCallback(() => {
    if (!audioEnabled || muted) return;
    soundscape.play("click");
  }, [audioEnabled, muted]);

  const playRandom = useCallback(() => {
    if (!audioEnabled || muted) return;
    soundscape.play("random");
  }, [audioEnabled, muted]);

  const playFavorite = useCallback(() => {
    if (!audioEnabled || muted) return;
    soundscape.play("favorite");
  }, [audioEnabled, muted]);

  return { playHover, playClick, playRandom, playFavorite, muted, toggleMute };
}
