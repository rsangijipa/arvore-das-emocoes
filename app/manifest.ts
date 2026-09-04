import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Árvore das Emoções",
    short_name: "Árvore",
    description:
      "Uma árvore 3D gerada do zero a cada visita. Toque nas folhas luminosas para receber mensagens de acolhimento.",
    lang: "pt-BR",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "any",
    background_color: "#0D1422",
    theme_color: "#0D1422",
    categories: ["lifestyle", "health"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
