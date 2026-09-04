"use client";

import { useEffect } from "react";

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    const register = async () => {
      try {
        const version = process.env.NEXT_PUBLIC_SW_VERSION ?? "dev";
        await navigator.serviceWorker.register(`/sw.js?v=${version}`, { scope: "/" });
      } catch {
        // Sem interrupcao da experiencia principal.
      }
    };

    if (document.readyState === "complete") {
      void register();
      return;
    }

    const onLoad = () => {
      void register();
    };

    window.addEventListener("load", onLoad);
    return () => {
      window.removeEventListener("load", onLoad);
    };
  }, []);

  return null;
}
