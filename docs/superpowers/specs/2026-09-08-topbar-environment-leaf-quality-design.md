# Top bar unificada, ambiente Sol/Tarde/Noite e qualidade das folhas-mensagem

Data: 2026-09-08
Status: Aprovado (a validar após leitura final do usuário)

## Contexto

A experiência hoje espalha controles em vários lugares: painel recolhível de
canto no desktop, bottom sheet no mobile, botão "Nova árvore" solto no canto
oposto, e um cluster de botões soltos no rodapé direito (Respirar, Check-out,
seletor de Sensações). `ExperienceRoot.tsx` concentra 969 linhas — estado,
orquestração de sessão emocional, todo o JSX de HUD e a sincronização de
favoritos — bem acima do limite de 500 linhas do projeto.

O pedido do usuário tem 4 partes:
1. Aplicar as correções já identificadas (dividir `ExperienceRoot.tsx`).
2. Unificar todos os botões numa top bar com seletores.
3. Melhorar a qualidade de exibição das folhas com mensagem.
4. Adicionar seleção manual de ambiente: Sol, Tarde, Noite.

A infraestrutura de variantes visuais por período do dia (luz, névoa, céu,
tom das folhas) **já existe inteira** em `lib/theme/scene-variant.ts` e
`lib/theme/panorama.ts` (tipo `SceneVariant = "morning" | "day" | "evening" |
"night"`, com tokens completos por variante). Hoje ela só é escolhida uma vez
no bootstrap via `getSceneVariant(new Date().getHours())` e nunca é exposta
ao usuário.

## 1. Refactor de `ExperienceRoot.tsx`

**Extrair `components/experience/TopBar.tsx`**: componente novo que absorve
todo o JSX de HUD hoje embutido em `ExperienceRoot` (linhas ~587–843 do
arquivo atual: painel de canto desktop, bottom sheet mobile, botão "Nova
árvore", cluster de botões do rodapé direito). Ver seção 2 para o
comportamento da top bar.

**Extrair `hooks/useFavoritesSync.ts`**: hook novo que absorve os dois
`useEffect` de favoritos (carregar do `localStorage` por `sessionId`, buscar
da nuvem via `fetchFavorites`, mesclar com `mergeFavoriteIds`, persistir
merge de volta). Assinatura:

```ts
function useFavoritesSync(sessionId: string): void
```

Ele lê e escreve direto no `useQuoteStore` (mesmo padrão que o código atual
já usa via `useQuoteStore.getState()`), então não precisa devolver nada —
efeito colateral encapsulado, igual ao hook `useEmotionalSession` já existente
no projeto.

**Resultado esperado**: `ExperienceRoot.tsx` fica responsável por estado de
cena, handlers de folha/tema/ambiente e composição dos componentes filhos
(`TopBar`, `LeafMessageCard`, `EmotionalCheckIn`, `BreathingLeaf`,
`FavoritesDrawer`, `TreeScene`). Deve cair para bem menos de 500 linhas — não
é um alvo numérico rígido, é consequência de mover ~350 linhas de JSX e ~35
linhas de efeitos para os módulos novos.

**Fora de escopo**: o modo `"unverified"` do Firebase Admin (fallback sem
autenticação quando as env vars não estão configuradas) já está correto no
código — o risco é operacional (esquecer de configurar em produção), não uma
correção de código. Nenhuma mudança nele.

## 2. Top bar unificada

Novo componente `components/experience/TopBar.tsx`, fixo no topo da tela,
substituindo por completo: painel de canto desktop, bottom sheet mobile,
botão solto "Nova árvore" e cluster de botões do rodapé direito
(Respirar/Check-out/Sensações).

### Conteúdo (mesmo em ambos os breakpoints)

- Seletor **Tema** (as opções de `THEMES`, mais "Todos")
- Seletor **Ambiente** (Sol / Tarde / Noite — ver seção 3)
- Seletor **Sensações** (Completo / Calmo / Mínimo — já existe hoje como
  `<select>` nativo, só muda de lugar)
- Botão **Favoritas** (com contador, abre `FavoritesDrawer`)
- Botão **Mudo/Som** (só renderiza se `NEXT_PUBLIC_ENABLE_AUDIO === "1"`,
  como hoje)
- Botão **Nova árvore** (`regenerateTree`)
- Botão **Respirar com a folha** (abre `BreathingLeaf`)
- Botão **Como estou agora?** (abre check-out emocional)

### Desktop (`isMobile === false`)

Uma única barra horizontal fixa no topo (`position: fixed; top: 0`), com os
3 seletores agrupados à esquerda e os 5 botões de ação agrupados à direita.
Reaproveita as classes visuais já existentes (`hud-panel`, `hud-pill`,
`hud-divider`) para manter a identidade visual atual — não é um redesign
gráfico, é uma reorganização estrutural dos mesmos controles.

Tema e Ambiente viram dropdowns compactos no mesmo estilo do `<select>` de
Sensações que já existe (não mais os "chips" longos de `ThemeFilter`, que não
cabem numa barra horizontal com 3 seletores + 5 botões). O `ThemeFilter.tsx`
atual (chips com bolinha de cor) é descontinuado nesse local; a lógica de
cor por tema pode ser reaproveitada como indicador dentro do dropdown se
o tempo permitir, mas não é requisito.

### Mobile (`isMobile === true`)

Barra compacta fixa no topo: `[Tema ▾] [Ambiente ▾] [♥ Favoritas] [⋯]`.

O botão `[⋯]` ("Mais opções") abre um menu/drawer (reaproveitando o padrão
de bottom sheet já usado por `FavoritesDrawer`) contendo: Mudo/Som, Nova
árvore, Respirar, Como estou agora, e o seletor de Sensações.

O FAB central "Receber mensagem" no rodapé (`requestRandomLeaf`) **não muda**
— continua fixo embaixo, ao alcance do polegar, como hoje.

### Comportamento comum

- A top bar fica invisível quando o painel de mensagem está aberto
  (`panelOpen === true`) — mesmo comportamento de ocultar HUD que já existe
  hoje (`introLocked || panelOpen ? "opacity-0" : "opacity-100"`).
- Onboarding (`showIntro`): o texto de instrução ("Procure as 10 folhas...")
  continua aparecendo, agora dentro da top bar expandida/menu mobile, com o
  mesmo conteúdo textual de hoje.
- Acessibilidade: cada seletor mantém `aria-label` claro; o menu mobile é
  navegável por teclado e fecha com `Escape` (reaproveita o handler de
  teclado já existente em `ExperienceRoot`).

## 3. Ambiente: Sol / Tarde / Noite

- Seletor "Ambiente" com exatamente 3 opções, mapeadas para variantes
  internas que **já existem** em `SCENE_VARIANT_TOKENS`:
  - **Sol** → `"day"`
  - **Tarde** → `"evening"`
  - **Noite** → `"night"`
- A variante `"morning"` continua existindo no código (tokens, paleta do
  panorama) mas não aparece como opção no seletor.
- **Estado inicial**: a árvore sempre abre na variante `"morning"`, fixa —
  independente da hora real do dispositivo. Isso substitui a chamada atual
  `useState<SceneVariant>(() => getSceneVariant())` em `ExperienceRoot.tsx`
  por um valor inicial constante `"morning"`.
- A função `getSceneVariant(hour)` (detecção automática por hora) deixa de
  ser chamada. Como fica sem nenhum uso após a mudança, ela é removida de
  `lib/theme/scene-variant.ts` junto com qualquer teste/import associado —
  não faz sentido manter código morto.
- A escolha do usuário no seletor **não é persistida** (sem `localStorage`):
  vive em estado do componente (`useState`), igual ao `themeFilter` hoje.
  Ao recarregar a página, volta para `"morning"`.
- Trocar o ambiente não precisa regenerar a árvore (`treeSeed` não muda) —
  só os tokens visuais (`SCENE_VARIANT_TOKENS[sceneVariant]`) que já fluem
  para `TreeScene` → `SceneContent` → luzes/panorama/névoa, exatamente como
  funciona hoje para a variante única calculada no boot.
- Registro de interação: seguindo o padrão já usado para `theme_filter`
  (`postInteraction({ actionType: "theme_filter", ... })`), a troca de
  ambiente também dispara uma interação — reaproveita o mesmo tipo de ação
  já aceito pela rota (`INTERACTION_ACTIONS`); se `"theme_filter"` não for
  semanticamente adequado, usar o campo `theme` como hoje é usado para tema
  não se aplica a ambiente, então a chamada de interação para troca de
  ambiente é **opcional** e pode ser omitida — não é requisito funcional
  central desta spec.

## 4. Qualidade das folhas-mensagem

### 4.1 Textura na árvore 3D (`lib/tree/leafArtwork.ts`)

`createLeafDetailTexture` hoje gera uma textura só com nervuras em tons de
cinza (`buildDetailSvg`), sem gradiente nem variação de pigmento — a mesma
folha desenhada com riqueza total em `LeafSvg` (gradientes de luz, manchas
de pigmento, brilho, grão) fica achatada quando vai para a copa 3D.

- `buildDetailSvg` passa a incluir os mesmos elementos visuais que
  `LeafSvg` já desenha: gradiente radial de luz (`lit`/`inner`), manchas de
  pigmento (`blotches`, usando `buildLeafPalette`/`createLeafRandom` com a
  mesma semente por folha), sombra/realce ao longo da nervura central.
  Continua monocromático o suficiente para ser multiplicado pela cor da
  instância no `InstancedMesh` (não pode virar textura colorida fixa, ou
  perde a variação de tom por folha que já existe via `messageLeafTone`).
- Resolução da textura sobe de 512px para 1024px (`createLeafDetailTexture(1024)`
  na chamada em `Foliage.tsx`).
- A geometria da folha-mensagem (índice 3 em `createLeafVariants`, em
  `lib/tree/leafGeometry.ts`) passa a usar tesselação alta **fixa**, em vez de
  escalar com o parâmetro `detail` (que hoje reduz tesselação no perfil
  "safe"). Justificativa: são sempre exatamente `MESSAGE_LEAF_COUNT` (10)
  folhas — o custo extra de manter alta resolução nelas é desprezível mesmo
  no perfil mais leve, e são as folhas mais próximas da câmera/mais
  importantes da cena.

### 4.2 Paleta de cor (`lib/tree/leafArtwork.ts`)

`buildLeafPalette` hoje sorteia matiz numa faixa de 16° (31°–47°, argila→trigo).
Amplia-se a faixa de matiz e saturação para mais variação perceptível entre
as 10 folhas, mantendo a regra de luminosidade mínima clara já documentada no
código (contraste do texto por construção, não por sorte) — ou seja, a
faixa pode crescer em matiz/saturação, mas a luminosidade mínima do "base"
não pode cair a ponto de comprometer a legibilidade da tinta escura por
cima.

### 4.3 Cartão de mensagem (`components/ui/LeafSvg.tsx`, `LeafMessageCard.tsx`)

- **Legibilidade**: reforçar a elipse de clareamento (`${id}-page`) atrás do
  texto — maior opacidade e/ou raio — e/ou aumentar o contraste da tinta
  (`palette.ink`) para o texto nunca competir visualmente com nervuras e
  manchas de fundo, em qualquer combinação de paleta sorteada.
- **Layout mobile — orientação portrait real**: `LeafSvg` ganha uma variante
  de orientação vertical nativa, substituindo o `transform: rotate(-90deg)`
  em CSS usado hoje em `LeafMessageCard.tsx` (que gira a folha inteira,
  incluindo a elipse de clareamento do texto, distorcendo as proporções
  pensadas para paisagem). Abordagem: os mesmos dados de traçado (contorno,
  nervuras, veia central, definidos em `lib/tree/leafArtwork.ts`) são
  rotacionados matematicamente 90° em torno do centro do `viewBox`, gerando
  coordenadas para um `viewBox` vertical nativo (ex.: 700×1600) — mesma arte,
  sem CSS transform, sem os ajustes manuais de `leafWidth`/`textWidth` que
  hoje compensam a rotação (`min(150vh, 168vw)` etc.).
  - Implementação sugerida: função utilitária que recebe os paths de
    `leafArtwork.ts` e devolve versões rotacionadas, ou um `<g transform="rotate(90 ...)">`
    envolvendo o conteúdo existente dentro de um `<svg viewBox>` vertical
    novo — a decisão de qual abordagem fica para a fase de implementação,
    desde que o resultado seja um `viewBox` nativo vertical (não uma rotação
    CSS do elemento inteiro).
  - `LeafMessageCard.tsx` passa a escolher a orientação da `LeafSvg` conforme
    `isMobile`, sem o `transform: rotate(-90deg)` no wrapper.
- **Fontes**: `MESSAGE_FONTS` em `LeafMessageCard.tsx` ganha mais
  combinações de família/peso/tamanho (hoje são 3), mantendo o mesmo
  mecanismo de seleção estável por `hashText(quote.id)`.

## Fora de escopo

- Testes automatizados (não pedido nesta rodada; a análise anterior já
  apontou a ausência de suíte de testes como lacuna geral do projeto).
- Qualquer mudança em `app/api/*`, autenticação Firebase, ou schema de dados.
- Persistência da escolha de ambiente (explicitamente descartada pelo
  usuário nesta rodada).
- Redesenho gráfico da identidade visual (cores/tipografia do app) além do
  necessário para a top bar e as folhas.

## Arquivos afetados (referência para o plano de implementação)

- `components/experience/ExperienceRoot.tsx` — remove JSX de HUD e efeitos
  de favoritos; usa `sceneVariant`/`setSceneVariant` (novo estado) em vez do
  cálculo único de `getSceneVariant()`.
- `components/experience/TopBar.tsx` — **novo**.
- `hooks/useFavoritesSync.ts` — **novo**.
- `lib/theme/scene-variant.ts` — remove `getSceneVariant(hour)`.
- `lib/tree/leafArtwork.ts` — `buildDetailSvg` mais rico, paleta com faixa
  maior, utilitário de rotação de traçado para orientação portrait.
- `lib/tree/leafGeometry.ts` — tesselação fixa alta para a variante de folha-
  mensagem (índice 3).
- `components/3d/Foliage.tsx` — chamada de `createLeafDetailTexture` com
  1024px.
- `components/ui/LeafSvg.tsx` — suporte a orientação portrait.
- `components/ui/LeafMessageCard.tsx` — usa orientação portrait no mobile em
  vez de CSS transform; `MESSAGE_FONTS` expandido.
- `components/ui/ThemeFilter.tsx` — descontinuado como controle de HUD (pode
  ser removido ou mantido sem uso, decisão do plano de implementação).
- Possível `data/labels.ts` — rótulos "Sol"/"Tarde"/"Noite" se for necessário
  centralizar (seguindo o padrão de `themeLabel`/`toneLabel` já existente).
