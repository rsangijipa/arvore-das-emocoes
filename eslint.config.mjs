import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // copia antiga do projeto que ficou dentro da pasta principal;
    // ela resolve "@/..." para a raiz e quebra o type-check/lint do build.
    "arvore-das-emocoes-main/**",
  ]),

  {
    // A camada 3D manipula objetos do three.js (materiais, uniforms, texturas),
    // que sao mutaveis POR DESIGN e vivem fora do ciclo de render do React: o
    // loop de animacao escreve `uniform.value` a cada frame. A regra de
    // imutabilidade do React Compiler nao modela esse tipo de objeto, e
    // contorna-la (recriando material a cada frame, por exemplo) pioraria o
    // desempenho sem ganho de correcao.
    files: ["components/3d/**/*.tsx"],
    rules: {
      "react-hooks/immutability": "off",
    },
  },
]);

export default eslintConfig;
