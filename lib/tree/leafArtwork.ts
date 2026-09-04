import * as THREE from "three";

/**
 * Arte da folha — fonte unica.
 *
 * O mesmo desenho alimenta dois destinos:
 *
 *  - o cartao SVG em tela cheia (`components/ui/LeafSvg`), que precisa de
 *    resolucao infinita porque a mensagem e lida em cima dele;
 *  - a textura das folhas-mensagem na copa 3D, gerada a partir DESTES mesmos
 *    tracos.
 *
 * Antes cada lado tinha o proprio desenho, e a folha que voava nao era a folha
 * que o usuario tinha clicado — pareciam duas folhas diferentes. Compartilhar
 * os tracos e a paleta e o que faz o salto ler como um movimento so.
 */

// ------------------------------------------------------------------ geometria

export const LEAF_VIEW_WIDTH = 1600;
export const LEAF_VIEW_HEIGHT = 700;

/** caixa util da lamina dentro do viewBox (sem o peciolo) */
export const LEAF_BLADE_BOX = { x: 205, y: 68, width: 1330, height: 590 };

export const LEAF_OUTLINE =
  "M220 352C247 232 328 158 464 121C633 76 788 103 955 147C1115 189 1269 230 1448 337C1489 361 1510 377 1529 394C1501 421 1462 446 1405 475C1248 554 1094 580 925 614C753 648 592 647 458 611C333 578 254 518 224 423C211 382 210 365 220 352Z";

export const LEAF_MIDRIB = "M219 359C515 358 819 366 1096 376C1266 381 1408 386 1527 394";
export const LEAF_MIDRIB_HIGHLIGHT =
  "M219 357C513 356 817 363 1094 372C1265 377 1407 381 1526 390";

/** nervuras primarias: [path, espessura] */
export const LEAF_VEINS_UPPER: [string, number][] = [
  ["M431 354C552 289 694 224 842 165", 4.6],
  ["M500 355C626 291 760 225 900 169", 4.4],
  ["M575 357C699 293 820 231 961 179", 4.2],
  ["M653 360C769 298 879 240 1022 191", 4.0],
  ["M736 363C841 305 945 250 1086 205", 3.8],
  ["M826 367C918 314 1011 266 1155 224", 3.6],
  ["M920 371C1000 324 1082 282 1221 247", 3.4],
  ["M1019 375C1088 334 1161 300 1285 273", 3.2],
  ["M1120 379C1177 345 1238 318 1344 297", 3.0],
  ["M1224 382C1268 356 1316 337 1392 325", 2.8],
  ["M1326 386C1360 367 1396 355 1449 350", 2.5],
];

export const LEAF_VEINS_LOWER: [string, number][] = [
  ["M432 357C554 429 694 510 841 598", 4.6],
  ["M501 359C627 429 759 505 901 591", 4.4],
  ["M576 361C701 428 820 497 962 578", 4.2],
  ["M654 364C770 425 883 490 1024 559", 4.0],
  ["M738 367C843 423 949 483 1089 538", 3.8],
  ["M828 370C920 421 1014 474 1158 514", 3.6],
  ["M922 373C1002 418 1086 460 1224 492", 3.4],
  ["M1020 377C1090 416 1164 448 1287 474", 3.2],
  ["M1122 380C1180 413 1241 438 1346 456", 3.0],
  ["M1225 383C1271 408 1319 425 1393 435", 2.8],
  ["M1327 387C1362 404 1397 415 1450 420", 2.5],
];

export const LEAF_VEINLETS_UPPER = [
  "M514 292L474 251",
  "M545 279L507 238",
  "M584 289L544 243",
  "M621 275L584 233",
  "M661 286L620 241",
  "M700 274L664 236",
  "M741 286L704 246",
  "M783 276L746 238",
  "M825 289L788 250",
  "M870 281L834 244",
  "M916 296L882 258",
  "M962 290L930 255",
  "M1007 305L976 271",
  "M1053 301L1025 270",
  "M1097 318L1071 289",
  "M1143 316L1119 289",
  "M1188 334L1165 309",
  "M1234 336L1213 313",
  "M1280 352L1261 331",
  "M1326 357L1308 338",
];

export const LEAF_VEINLETS_LOWER = [
  "M514 422L475 468",
  "M545 435L507 481",
  "M585 425L545 471",
  "M622 439L585 482",
  "M663 428L622 472",
  "M702 440L666 478",
  "M743 429L707 470",
  "M784 439L747 478",
  "M827 426L790 466",
  "M871 434L835 472",
  "M916 421L883 458",
  "M963 427L930 461",
  "M1008 413L977 447",
  "M1054 417L1025 450",
  "M1098 400L1072 430",
  "M1144 404L1120 432",
  "M1189 388L1166 414",
  "M1235 387L1214 411",
  "M1281 372L1262 394",
  "M1327 369L1309 389",
];

/** malha terciaria: o que separa "folha desenhada" de "folha observada" */
export const LEAF_VEIN_MESH = [
  "M560 285C578 278 591 267 607 252",
  "M639 284C655 277 668 267 685 252",
  "M719 286C734 279 747 270 761 256",
  "M801 291C816 284 828 275 842 262",
  "M885 300C899 294 911 286 925 274",
  "M969 310C983 304 995 296 1008 285",
  "M1051 323C1065 317 1078 310 1091 300",
  "M1134 338C1147 333 1159 327 1171 319",
  "M1216 353C1228 349 1240 344 1251 336",
  "M563 424C580 431 593 441 609 456",
  "M642 425C658 432 671 442 688 456",
  "M722 428C737 435 749 444 764 457",
  "M804 433C818 440 831 448 845 461",
  "M887 440C901 447 913 455 927 467",
  "M971 449C985 455 997 463 1011 474",
  "M1053 456C1067 462 1079 470 1093 480",
  "M1136 462C1149 467 1160 474 1173 482",
  "M1218 465C1231 469 1242 474 1254 481",
];

// -------------------------------------------------------------------- paleta

export function hashLeafId(value: string) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** LCG: a mesma folha volta sempre com a mesma cor */
export function createLeafRandom(seed: number) {
  let state = (seed | 0) || 1;
  return () => {
    state = (Math.imul(1664525, state) + 1013904223) | 0;
    return (state >>> 0) / 4294967296;
  };
}

function hsl(hue: number, saturation: number, lightness: number) {
  return `hsl(${hue.toFixed(1)} ${saturation.toFixed(1)}% ${lightness.toFixed(1)}%)`;
}

export type LeafPalette = ReturnType<typeof buildLeafPalette>;

/**
 * Tons terrosos CLAROS.
 *
 * A matiz passeia entre a argila (31deg) e o trigo (47deg) e a luminosidade
 * nunca desce do patamar claro: a mensagem e impressa em tinta escura sobre a
 * lamina, entao o contraste precisa estar garantido por construcao, nao por
 * sorte. A variacao mora no croma.
 */
export function buildLeafPalette(seed: number) {
  const random = createLeafRandom(seed);
  const hue = 31 + random() * 16;
  const saturation = 34 + random() * 16;
  const lift = random() * 4;

  return {
    hue,
    saturation,
    glow: hsl(hue + 6, saturation + 12, 89 + lift * 0.4),
    light: hsl(hue + 3, saturation + 6, 82 + lift * 0.5),
    base: hsl(hue, saturation, 74 + lift * 0.5),
    mid: hsl(hue - 2, saturation, 66 + lift * 0.4),
    deep: hsl(hue - 4, saturation + 2, 55 + lift * 0.3),
    edge: hsl(hue - 7, saturation + 4, 40),
    vein: hsl(hue - 8, saturation + 2, 36),
    veinSoft: hsl(hue - 8, saturation, 44),
    stem: hsl(hue - 10, saturation + 2, 34),
    /** tinta do texto: mesma familia da folha, so que quase preta */
    ink: hsl(hue - 12, saturation - 6, 15),
    blotch: hsl(hue - 5, saturation, 50),
  };
}

/** cor da folha na copa, no espaco linear do three */
export function leafCanopyColor(seed: number, target = new THREE.Color()) {
  const random = createLeafRandom(seed);
  const hue = (31 + random() * 16) / 360;
  const saturation = (34 + random() * 16) / 100;
  // a copa recebe o tom um pouco mais saturado: em escala pequena e contra o
  // verde, o bege claro do cartao sumiria
  return target.setHSL(hue, Math.min(0.58, saturation + 0.1), 0.52);
}

// ------------------------------------------------------------------- textura

/**
 * SVG monocromatico com as nervuras e o volume da folha, sem cor propria.
 *
 * Branco = lamina, cinza = nervura. O material multiplica isso pela cor da
 * instancia, entao a mesma textura serve as dez folhas-mensagem e cada uma
 * mantem o proprio tom terroso.
 */
function buildDetailSvg() {
  const veins = [...LEAF_VEINS_UPPER, ...LEAF_VEINS_LOWER]
    .map(([path, width]) => `<path d="${path}" stroke="#6E655A" stroke-width="${width * 1.5}"/>`)
    .join("");

  const veinlets = [...LEAF_VEINLETS_UPPER, ...LEAF_VEINLETS_LOWER]
    .map((path) => `<path d="${path}" stroke="#8B8378" stroke-width="3"/>`)
    .join("");

  const mesh = LEAF_VEIN_MESH.map(
    (path) => `<path d="${path}" stroke="#9A9288" stroke-width="2"/>`,
  ).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${LEAF_VIEW_WIDTH}" height="${LEAF_VIEW_HEIGHT}" viewBox="0 0 ${LEAF_VIEW_WIDTH} ${LEAF_VIEW_HEIGHT}">
  <defs>
    <radialGradient id="lit" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(705 334) rotate(7.8) scale(512 248)">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.85"/>
      <stop offset="0.45" stop-color="#FFFFFF" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${LEAF_VIEW_WIDTH}" height="${LEAF_VIEW_HEIGHT}" fill="#C9C2B8"/>
  <rect width="${LEAF_VIEW_WIDTH}" height="${LEAF_VIEW_HEIGHT}" fill="url(#lit)"/>
  <path d="M275 273C479 170 759 162 1055 218C886 208 675 235 474 327C404 360 315 346 275 273Z" fill="#FFFFFF" opacity="0.4"/>
  <path d="M278 470C548 564 889 572 1218 489C1070 524 897 545 716 543C545 541 397 514 278 470Z" fill="#5A544B" opacity="0.18"/>
  <g fill="none" stroke-linecap="round" opacity="0.9">${veins}${veinlets}${mesh}</g>
  <path d="${LEAF_MIDRIB}" fill="none" stroke="#5F574C" stroke-width="18" stroke-linecap="round"/>
  <path d="${LEAF_MIDRIB_HIGHLIGHT}" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-opacity="0.7" stroke-linecap="round"/>
</svg>`;
}

/**
 * Textura da folha-mensagem na copa.
 *
 * A malha 3D cresce em +Y (peciolo -> ponta) e o desenho corre em +X, entao o
 * recorte da lamina entra girado 90deg: sem isso as nervuras apareceriam
 * atravessadas na folha.
 */
export function createLeafDetailTexture(resolution = 512): THREE.CanvasTexture | null {
  if (typeof document === "undefined") {
    return null;
  }

  const box = LEAF_BLADE_BOX;
  const scale = resolution / box.height;

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(box.height * scale);
  canvas.height = Math.round(box.width * scale);

  const context = canvas.getContext("2d");
  if (!context) {
    return null;
  }

  // enquanto o SVG nao decodifica, a folha usa a lamina lisa — nunca um vazio
  context.fillStyle = "#CFC8BE";
  context.fillRect(0, 0, canvas.width, canvas.height);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;

  const image = new Image();
  image.onload = () => {
    // (x,y) do desenho -> (y - box.y, boxRight - x) na textura: a ponta da
    // folha fica no topo (v = 1), a base no rodape (v = 0)
    context.setTransform(0, -scale, scale, 0, -box.y * scale, (box.x + box.width) * scale);
    context.drawImage(image, 0, 0);
    context.setTransform(1, 0, 0, 1, 0, 0);
    texture.needsUpdate = true;
  };
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildDetailSvg())}`;

  return texture;
}

/**
 * Tons das folhas-mensagem na copa.
 *
 * Um por indice, estaveis: a folha que voa precisa carregar exatamente a cor
 * da folha que estava no galho.
 */
const MESSAGE_LEAF_TONES = Array.from({ length: 12 }, (_, index) =>
  leafCanopyColor(Math.imul(index + 1, 2654435761) ^ 0x1f2b3c),
);

export function messageLeafTone(index: number) {
  return MESSAGE_LEAF_TONES[((index % MESSAGE_LEAF_TONES.length) + MESSAGE_LEAF_TONES.length) % MESSAGE_LEAF_TONES.length];
}
