"use client";

import { useEffect } from "react";

import { ExperienceRoot } from "@/components/experience/ExperienceRoot";

export default function ExperienceClient() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "development") {
      return;
    }

    const originalWarn = console.warn;

    console.warn = (...args: unknown[]) => {
      const firstArg = String(args[0] ?? "");

      if (
        firstArg.includes("THREE.THREE.Clock: This module has been deprecated") ||
        firstArg.includes("THREE.WebGLShadowMap: PCFSoftShadowMap has been deprecated")
      ) {
        return;
      }

      originalWarn(...args);
    };

    return () => {
      console.warn = originalWarn;
    };
  }, []);

  return <ExperienceRoot />;
}
