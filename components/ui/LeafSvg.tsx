"use client";

import { useMemo } from "react";

/**
 * Folha vetorial de alta resolucao.
 *
 * A silhueta e as nervuras sao geradas por formula (mesma familia de curvas da
 * folha 3D), entao a folha escala para qualquer tamanho sem perder definicao —
 * que e justamente o ponto fraco de exibir a malha 3D em close.
 */

const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 440;
const CENTER_Y = 220;
const BASE_X = 46;
const TIP_X = 968;
const MAX_HALF = 168;

/** meia-altura da lamina em t (0 = base, 1 = ponta) */
function halfHeight(t: number, ripplePhase: number, rippleAmount: number) {
  const body = Math.pow(Math.sin(Math.PI * Math.pow(t, 0.6)), 0.8);
  const ripple = 1 + rippleAmount * Math.sin(t * Math.PI * 10 + ripplePhase);
  return MAX_HALF * body * ripple;
}

function buildOutline(samples = 90) {
  const points: string[] = [];

  for (let index = 0; index <= samples; index += 1) {
    const t = index / samples;
    const x = BASE_X + t * (TIP_X - BASE_X);
    points.push(`${x.toFixed(1)},${(CENTER_Y - halfHeight(t, 0, 0.018)).toFixed(1)}`);
  }

  // borda inferior levemente diferente: folha real nao e simetrica
  for (let index = samples; index >= 0; index -= 1) {
    const t = index / samples;
    const x = BASE_X + t * (TIP_X - BASE_X);
    points.push(`${x.toFixed(1)},${(CENTER_Y + halfHeight(t, 1.7, 0.024) * 1.02).toFixed(1)}`);
  }

  return `M ${points.join(" L ")} Z`;
}

function buildVeins(count = 9) {
  const veins: string[] = [];

  for (let index = 1; index <= count; index += 1) {
    const t = 0.08 + (index / (count + 1)) * 0.84;
    const startX = BASE_X + t * (TIP_X - BASE_X);
    const reach = (1 - t) * 0.62 + 0.16;

    for (const side of [-1, 1] as const) {
      const half = halfHeight(t, side < 0 ? 0 : 1.7, 0.02) * 0.88;
      const endX = startX + (TIP_X - startX) * reach * 0.72;
      const endY = CENTER_Y + side * half;
      const controlX = startX + (endX - startX) * 0.34;
      const controlY = CENTER_Y + side * half * 0.42;

      veins.push(
        `M ${startX.toFixed(1)} ${CENTER_Y} Q ${controlX.toFixed(1)} ${controlY.toFixed(1)} ${endX.toFixed(1)} ${endY.toFixed(1)}`,
      );
    }
  }

  return veins;
}

export type LeafSvgProps = {
  /** id unico para os defs (permite mais de uma folha na pagina) */
  id: string;
  className?: string;
};

export function LeafSvg({ id, className }: LeafSvgProps) {
  const outline = useMemo(() => buildOutline(), []);
  const veins = useMemo(() => buildVeins(), []);
  const midrib = `M 2 ${CENTER_Y + 4} C 18 ${CENTER_Y + 2} 32 ${CENTER_Y} ${BASE_X} ${CENTER_Y - 1} L ${TIP_X} ${CENTER_Y}`;

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      className={className}
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-blade`} x1="0" y1="0" x2="1" y2="0.75">
          <stop offset="0" stopColor="#6E4E29" />
          <stop offset="0.28" stopColor="#9A7038" />
          <stop offset="0.62" stopColor="#C0954E" />
          <stop offset="0.88" stopColor="#D8B978" />
          <stop offset="1" stopColor="#E7D6A2" />
        </linearGradient>

        <radialGradient id={`${id}-sheen`} cx="0.34" cy="0.3" r="0.7">
          <stop offset="0" stopColor="#FFF3D2" stopOpacity="0.55" />
          <stop offset="0.55" stopColor="#FFF3D2" stopOpacity="0.12" />
          <stop offset="1" stopColor="#FFF3D2" stopOpacity="0" />
        </radialGradient>

        {/* area do texto: levemente mais escura, para o contraste com a lamina */}
        <radialGradient id={`${id}-ink`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#1A1409" stopOpacity="0.82" />
          <stop offset="0.62" stopColor="#1A1409" stopOpacity="0.66" />
          <stop offset="1" stopColor="#1A1409" stopOpacity="0" />
        </radialGradient>

        <clipPath id={`${id}-clip`}>
          <path d={outline} />
        </clipPath>

        <filter id={`${id}-shadow`} x="-12%" y="-30%" width="124%" height="170%">
          <feDropShadow dx="0" dy="16" stdDeviation="22" floodColor="#06100A" floodOpacity="0.55" />
        </filter>

        <filter id={`${id}-grain`} x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" seed="7" result="noise" />
          <feColorMatrix in="noise" type="saturate" values="0" result="mono" />
          <feComponentTransfer in="mono" result="soft">
            <feFuncA type="linear" slope="0.14" intercept="0" />
          </feComponentTransfer>
          <feComposite in="soft" in2="SourceGraphic" operator="in" />
        </filter>
      </defs>

      <g filter={`url(#${id}-shadow)`}>
        {/* peciolo */}
        <path
          d={`M 0 ${CENTER_Y + 8} C 14 ${CENTER_Y + 5} 30 ${CENTER_Y + 2} ${BASE_X + 6} ${CENTER_Y}`}
          fill="none"
          stroke="#6A4B27"
          strokeWidth="11"
          strokeLinecap="round"
        />

        <path d={outline} fill={`url(#${id}-blade)`} />

        <g clipPath={`url(#${id}-clip)`}>
          <rect x="0" y="0" width={VIEW_WIDTH} height={VIEW_HEIGHT} fill={`url(#${id}-sheen)`} />
          <rect
            x="0"
            y="0"
            width={VIEW_WIDTH}
            height={VIEW_HEIGHT}
            fill="#F6E6BE"
            filter={`url(#${id}-grain)`}
            opacity="0.55"
          />

          {/* nervuras secundarias */}
          <g stroke="#4E3418" strokeOpacity="0.34" strokeWidth="2.6" fill="none" strokeLinecap="round">
            {veins.map((vein, index) => (
              <path key={index} d={vein} />
            ))}
          </g>

          {/* nervura central */}
          <path d={midrib} stroke="#4A3116" strokeOpacity="0.55" strokeWidth="7" fill="none" strokeLinecap="round" />
          <path
            d={midrib}
            stroke="#F4E3B6"
            strokeOpacity="0.3"
            strokeWidth="2.4"
            fill="none"
            strokeLinecap="round"
            transform="translate(0,-3)"
          />

          {/* fundo da mensagem */}
          <ellipse cx={VIEW_WIDTH * 0.5} cy={CENTER_Y} rx="330" ry="130" fill={`url(#${id}-ink)`} />
        </g>

        <path d={outline} fill="none" stroke="#4A3116" strokeOpacity="0.4" strokeWidth="2.5" />
      </g>
    </svg>
  );
}
