import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Arvore da Presenca",
    short_name: "Arvore",
    description: "Experiencia 3D contemplativa para regulacao emocional com frases em folhas interativas.",
    start_url: "/",
    display: "standalone",
    background_color: "#0D1422",
    theme_color: "#0D1422",
    icons: [
      {
        src: "/next.svg",
        sizes: "any",
        type: "image/svg+xml",
      },
    ],
  };
}
