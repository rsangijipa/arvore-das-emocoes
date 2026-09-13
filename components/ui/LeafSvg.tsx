"use client";

import { useMemo } from "react";

import {
  buildLeafPalette,
  createLeafRandom,
  hashLeafId,
  LEAF_MIDRIB,
  LEAF_MIDRIB_HIGHLIGHT,
  LEAF_OUTLINE,
  LEAF_VEINLETS_LOWER,
  LEAF_VEINLETS_UPPER,
  LEAF_VEIN_MESH,
  LEAF_VEINS_LOWER,
  LEAF_VEINS_UPPER,
  LEAF_VIEW_HEIGHT,
  LEAF_VIEW_WIDTH,
} from "@/lib/tree/leafArtwork";

/**
 * Folha vetorial de alta definicao.
 *
 * A silhueta, as nervuras e a paleta vem de `lib/tree/leafArtwork`, o mesmo
 * modulo que gera a textura das folhas-mensagem na copa: a folha que o usuario
 * clica e a folha que abre na tela.
 */

/** tinta legivel da mensagem para esta folha — usada pelo card */
export function leafInkColor(id: string) {
  return buildLeafPalette(hashLeafId(id)).ink;
}

// -------------------------------------------------------------- componente

export type LeafSvgProps = {
  /** id unico: define os defs locais E sorteia o tom terroso desta folha */
  id: string;
  className?: string;
};

export function LeafSvg({ id, className }: LeafSvgProps) {
  const seed = useMemo(() => hashLeafId(id), [id]);
  const palette = useMemo(() => buildLeafPalette(seed), [seed]);

  /** manchas de pigmento: quebram a lisura do gradiente sem virar textura */
  const blotches = useMemo(() => {
    const random = createLeafRandom(seed ^ 0x9e3779b9);
    return Array.from({ length: 14 }, () => ({
      cx: 300 + random() * 1080,
      cy: 190 + random() * 320,
      rx: 26 + random() * 74,
      ry: 14 + random() * 34,
      rotate: -28 + random() * 56,
      opacity: 0.05 + random() * 0.09,
    }));
  }, [seed]);

  return (
    <svg
      viewBox={`0 0 ${LEAF_VIEW_WIDTH} ${LEAF_VIEW_HEIGHT}`}
      className={className}
      aria-hidden
      focusable="false"
    >
      <defs>
        <linearGradient id={`${id}-blade`} x1="217" y1="120" x2="1505" y2="586" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={palette.deep} />
          <stop offset="0.18" stopColor={palette.mid} />
          <stop offset="0.38" stopColor={palette.light} />
          <stop offset="0.56" stopColor={palette.base} />
          <stop offset="0.77" stopColor={palette.light} />
          <stop offset="1" stopColor={palette.deep} />
        </linearGradient>

        {/* luz atravessando a lamina, deslocada do centro geometrico */}
        <radialGradient
          id={`${id}-inner`}
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(705 334) rotate(7.8) scale(512 248)"
        >
          <stop offset="0" stopColor={palette.glow} stopOpacity="0.85" />
          <stop offset="0.42" stopColor={palette.glow} stopOpacity="0.34" />
          <stop offset="1" stopColor={palette.deep} stopOpacity="0" />
        </radialGradient>

        <linearGradient id={`${id}-edge`} x1="222" y1="147" x2="1477" y2="542" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={palette.edge} />
          <stop offset="0.48" stopColor={palette.veinSoft} />
          <stop offset="1" stopColor={palette.edge} />
        </linearGradient>

        <linearGradient id={`${id}-midrib`} x1="217" y1="361" x2="1529" y2="394" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={palette.stem} />
          <stop offset="0.25" stopColor={palette.veinSoft} />
          <stop offset="0.5" stopColor={palette.vein} />
          <stop offset="0.74" stopColor={palette.veinSoft} />
          <stop offset="1" stopColor={palette.stem} />
        </linearGradient>

        <linearGradient id={`${id}-vein`} x1="430" y1="160" x2="1455" y2="538" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={palette.vein} stopOpacity="0.72" />
          <stop offset="0.55" stopColor={palette.veinSoft} stopOpacity="0.56" />
          <stop offset="1" stopColor={palette.vein} stopOpacity="0.32" />
        </linearGradient>

        <linearGradient id={`${id}-veinlet`} x1="500" y1="190" x2="1380" y2="520" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={palette.vein} stopOpacity="0.3" />
          <stop offset="1" stopColor={palette.veinSoft} stopOpacity="0.2" />
        </linearGradient>

        <linearGradient id={`${id}-stem`} x1="80" y1="382" x2="236" y2="363" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={palette.stem} />
          <stop offset="0.52" stopColor={palette.veinSoft} />
          <stop offset="1" stopColor={palette.stem} />
        </linearGradient>

        {/* clareamento sob o texto: a mensagem e escura, a lamina abre caminho */}
        <radialGradient id={`${id}-page`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={palette.glow} stopOpacity="0.96" />
          <stop offset="0.65" stopColor={palette.light} stopOpacity="0.72" />
          <stop offset="1" stopColor={palette.base} stopOpacity="0.05" />
        </radialGradient>

        <filter id={`${id}-shadow`} x="-8%" y="-24%" width="118%" height="156%">
          <feDropShadow dx="0" dy="24" stdDeviation="28" floodColor="#060C04" floodOpacity="0.56" />
        </filter>

        {/* grao: fractalNoise em soft-light da a lamina a aspereza do papel pergaminho */}
        <filter id={`${id}-grain`} x="166" y="79" width="1398" height="588" filterUnits="userSpaceOnUse">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" seed={seed % 100} result="noise" />
          <feColorMatrix in="noise" type="saturate" values="0" result="mono" />
          <feComponentTransfer in="mono" result="softNoise">
            <feFuncA type="table" tableValues="0 0.11" />
          </feComponentTransfer>
          <feBlend in="SourceGraphic" in2="softNoise" mode="soft-light" />
        </filter>

        <clipPath id={`${id}-clip`}>
          <path d={LEAF_OUTLINE} />
        </clipPath>
      </defs>

      {/* peciolo com textura e anel de transição */}
      <path
        d="M80 388C122 377 171 367 232 362"
        stroke={`url(#${id}-stem)`}
        strokeWidth="20"
        strokeLinecap="round"
        fill="none"
      />
      <path
        d="M90 386C130 376 172 367 220 363"
        stroke={palette.glow}
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeOpacity="0.45"
        fill="none"
      />

      <g filter={`url(#${id}-shadow)`}>
        <path d={LEAF_OUTLINE} fill={`url(#${id}-blade)`} stroke={`url(#${id}-edge)`} strokeWidth="5" />

        {/* filete dourado/luz de borda interna */}
        <path
          d={LEAF_OUTLINE}
          fill="none"
          stroke={palette.goldAccent ?? palette.glow}
          strokeWidth="1.6"
          strokeOpacity="0.5"
        />

        <g clipPath={`url(#${id}-clip)`} filter={`url(#${id}-grain)`}>
          <rect x="166" y="79" width="1398" height="588" fill={`url(#${id}-inner)`} />

          {/* volume: a metade superior pega luz, a inferior recolhe */}
          <path
            d="M275 273C479 170 759 162 1055 218C886 208 675 235 474 327C404 360 315 346 275 273Z"
            fill={palette.glow}
            opacity="0.44"
          />
          <path
            d="M278 470C548 564 889 572 1218 489C1070 524 897 545 716 543C545 541 397 514 278 470Z"
            fill={palette.edge}
            opacity="0.16"
          />

          {/* pigmentacao irregular — dentro do clipPath da lâmina para não transbordar */}
          <g clipPath={`url(#${id}-clip)`}>
            {blotches.map((blotch, index) => (
              <ellipse
                key={`blotch-${index}`}
                cx={blotch.cx}
                cy={blotch.cy}
                rx={blotch.rx}
                ry={blotch.ry}
                fill={palette.blotch}
                opacity={blotch.opacity}
                transform={`rotate(${blotch.rotate.toFixed(1)} ${blotch.cx.toFixed(1)} ${blotch.cy.toFixed(1)})`}
              />
            ))}
          </g>

          {/* sombra e realce difusos ao longo da nervura central */}
          <path
            d="M222 348C651 316 1114 328 1526 393"
            stroke={palette.edge}
            strokeOpacity="0.14"
            strokeWidth="44"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M220 357C645 370 1114 386 1526 398"
            stroke={palette.glow}
            strokeOpacity="0.58"
            strokeWidth="24"
            strokeLinecap="round"
            fill="none"
          />

          <g stroke={`url(#${id}-vein)`} strokeLinecap="round" fill="none">
            {LEAF_VEINS_UPPER.map(([path, width], index) => (
              <path key={`vu-${index}`} d={path} strokeWidth={width} />
            ))}
            {LEAF_VEINS_LOWER.map(([path, width], index) => (
              <path key={`vl-${index}`} d={path} strokeWidth={width} />
            ))}
          </g>

          <g stroke={`url(#${id}-veinlet)`} strokeLinecap="round" fill="none" strokeWidth="2.2">
            {LEAF_VEINLETS_UPPER.map((path, index) => (
              <path key={`nu-${index}`} d={path} />
            ))}
            {LEAF_VEINLETS_LOWER.map((path, index) => (
              <path key={`nl-${index}`} d={path} />
            ))}
          </g>

          <g stroke={palette.vein} strokeOpacity="0.28" strokeLinecap="round" fill="none" strokeWidth="1.3">
            {LEAF_VEIN_MESH.map((path, index) => (
              <path key={`mesh-${index}`} d={path} />
            ))}
          </g>

          {/* nervura central majestosa com filete duplo */}
          <path d={LEAF_MIDRIB} stroke={`url(#${id}-midrib)`} strokeWidth="14" strokeLinecap="round" fill="none" />
          <path
            d={LEAF_MIDRIB_HIGHLIGHT}
            stroke={palette.glow}
            strokeOpacity="0.75"
            strokeWidth="3.2"
            strokeLinecap="round"
            fill="none"
          />

          {/* pagina da mensagem iluminada suavemente */}
          <ellipse cx="860" cy="368" rx="490" ry="195" fill={`url(#${id}-page)`} />
          <ellipse cx="860" cy="368" rx="380" ry="130" fill={`url(#${id}-page)`} opacity="0.85" />

          {/* ornamentos botânicos discretos nas extremidades da página */}
          <circle cx="430" cy="358" r="4.5" fill={palette.vein} opacity="0.32" />
          <circle cx="1290" cy="378" r="4.5" fill={palette.vein} opacity="0.32" />
        </g>
      </g>
    </svg>
  );
}
