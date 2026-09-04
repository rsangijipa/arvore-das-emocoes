import path from "node:path";

import type { NextConfig } from "next";

/**
 * Versao do cache do service worker.
 *
 * O `sw.js` nomeia os caches a partir daqui e apaga qualquer cache com nome
 * diferente no `activate`. Sem isso, o app shell antigo sobreviveria a todo
 * deploy: quem ja instalou o PWA continuaria vendo a versao anterior.
 */
const BUILD_ID = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 8) ?? String(Date.now());

const nextConfig: NextConfig = {
  // ha um package-lock.json em C:\Users\<user>\ alem do lockfile do projeto;
  // sem fixar a raiz, o Turbopack escolhe o de cima e avisa em todo build
  turbopack: {
    root: path.resolve(process.cwd()),
  },

  env: {
    NEXT_PUBLIC_SW_VERSION: BUILD_ID,
  },

  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
