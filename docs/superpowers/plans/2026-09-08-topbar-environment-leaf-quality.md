# Top bar unificada, ambiente Sol/Tarde/Noite e qualidade das folhas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify all HUD controls into a single top bar (desktop + mobile), add a manual Sol/Tarde/Noite environment selector on top of the scene-variant system that already exists, raise the visual fidelity of the 10 message-leaves (in the 3D tree and in the message card), and split `ExperienceRoot.tsx` (969 lines) so the new top bar lives in its own module.

**Architecture:** Two new presentational components (`TopBar`, `TopBarMobile`) replace all HUD JSX currently inline in `ExperienceRoot.tsx`; a small shared options module (`topBarOptions.ts`) and a reusable `TopBarSelect` dropdown back both. `ExperienceRoot.tsx` keeps scene state and handlers, delegates favorites bootstrap/sync to a new `useFavoritesSync` hook, and gets a `sceneVariant` state that starts at `"morning"` and is changed only by the user. Leaf-quality work is confined to `lib/tree/leafArtwork.ts`, `lib/tree/leafGeometry.ts`, `components/3d/Foliage.tsx`, `components/ui/LeafSvg.tsx` and `components/ui/LeafMessageCard.tsx` — no new dependencies, no 3D architecture change.

**Tech Stack:** Next.js 16 / React 19, TypeScript, Tailwind v4, Zustand, Framer Motion (`motion/react`), React Three Fiber / drei / three, lucide-react icons.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-09-08-topbar-environment-leaf-quality-design.md` — every task implements a section of it.
- **No automated test suite exists in this project** (no test runner, no `test` script). This is an explicit, documented scope decision in the spec ("Fora de escopo: Testes automatizados"), not an oversight — do not introduce a test framework as part of this plan. Each task's "test" step is replaced by: `npx tsc --noEmit` (must be clean), `npx eslint <touched files>` (must be clean), and a manual check in the running dev server (`npm run dev`) as described per task.
- All new/changed UI copy is in Brazilian Portuguese, matching the existing tone (see `data/labels.ts`, existing button copy in `ExperienceRoot.tsx`).
- Reuse existing CSS utility classes (`hud-panel`, `hud-pill`, `hud-card`, `hud-divider`, `hud-list-item`, defined in `app/globals.css`) instead of inventing new visual language. No changes to `app/globals.css` are needed by this plan.
- No new npm dependencies. No changes to `app/api/*`, Firebase auth/admin code, or `types/quote.ts`'s `INTERACTION_ACTIONS` — the environment selector does **not** post an interaction (spec explicitly leaves this optional and out of scope).
- Environment selection (`sceneVariant`) is **not** persisted to `localStorage`. It always starts at `"morning"` on every load.
- Every commit made while executing this plan ends with:
  ```
  Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01KoTFzCCWR5rm9W49aFnvWt
  ```
- Windows/Git Bash environment: use forward slashes in commands; `npx` works the same as on POSIX.

## File Structure

| File | Change |
|---|---|
| `hooks/useFavoritesSync.ts` | **New.** Extracted favorites bootstrap/cloud-sync effects. |
| `lib/theme/scene-variant.ts` | Remove `getSceneVariant(hour)` (dead after this plan); keep types/tokens. |
| `components/experience/topBarOptions.ts` | **New.** Shared `TopBarSelectOption` type + option lists (theme, environment, sensory) consumed by both top bar variants. |
| `components/experience/TopBarSelect.tsx` | **New.** Generic compact dropdown used by both top bar variants. |
| `components/experience/TopBar.tsx` | **New.** Desktop top bar. |
| `components/experience/TopBarMobile.tsx` | **New.** Mobile compact bar + "Mais opções" sheet. |
| `components/experience/ExperienceRoot.tsx` | Remove old HUD JSX/state; wire the two new top bar components; use `useFavoritesSync`; `sceneVariant` becomes user-controlled, starting at `"morning"`. |
| `components/ui/ThemeFilter.tsx` | **Deleted** (fully superseded by `TopBarSelect`, no remaining usage). |
| `lib/tree/leafArtwork.ts` | Richer `buildDetailSvg()` (gradient + pigment blotches); wider hue/saturation range in `buildLeafPalette` and `leafCanopyColor`. |
| `components/3d/Foliage.tsx` | `createLeafDetailTexture(1024)` instead of `512`. |
| `lib/tree/leafGeometry.ts` | Message-leaf variant (index 3) gets fixed high tessellation, no longer scaled by `detail`. |
| `components/ui/LeafSvg.tsx` | New `orientation` prop (`"landscape" \| "portrait"`) — portrait renders the same artwork in a native vertical `viewBox`. |
| `components/ui/LeafMessageCard.tsx` | Uses `orientation="portrait"` on mobile instead of CSS `rotate(-90deg)`; stronger "page" legibility ellipse; `MESSAGE_FONTS` expanded from 3 to 6 entries. |

---

### Task 1: Extract `useFavoritesSync` hook

**Files:**
- Create: `hooks/useFavoritesSync.ts`
- Modify: `components/experience/ExperienceRoot.tsx`

**Interfaces:**
- Produces: `useFavoritesSync(sessionId: string): void` — call it once per mount; it reads/writes `useQuoteStore`'s `sessionId` and `favorites` fields as a side effect, same as the code it replaces.

- [ ] **Step 1: Create the hook**

Create `hooks/useFavoritesSync.ts`:

```ts
"use client";

import { useEffect } from "react";

import { fetchFavorites, postFavorite } from "@/lib/client/interactions-api";
import { loadFavorites, mergeFavoriteIds, saveFavorites } from "@/lib/utils/local-favorites";
import { useQuoteStore } from "@/store/useQuoteStore";

/**
 * Carrega favoritas locais no boot e sincroniza com a nuvem (merge local +
 * nuvem, reenviando ao servidor o que faltar lá). Efeito colateral puro sobre
 * o useQuoteStore, mesmo padrão de useEmotionalSession — não devolve nada.
 */
export function useFavoritesSync(sessionId: string): void {
  const setSessionId = useQuoteStore((state) => state.setSessionId);
  const setFavorites = useQuoteStore((state) => state.setFavorites);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    setSessionId(sessionId);
    setFavorites(loadFavorites(sessionId));
  }, [sessionId, setFavorites, setSessionId]);

  useEffect(() => {
    if (!sessionId) {
      return;
    }

    let cancelled = false;
    const localFavorites = loadFavorites(sessionId);

    void fetchFavorites(sessionId)
      .then((cloudFavorites) => {
        if (cancelled) {
          return;
        }

        const mergedFavorites = mergeFavoriteIds(localFavorites, cloudFavorites);
        setFavorites(mergedFavorites);
        saveFavorites(sessionId, mergedFavorites);

        const missingInCloud = mergedFavorites.filter((quoteId) => !cloudFavorites.includes(quoteId));
        for (const quoteId of missingInCloud) {
          void postFavorite({ sessionId, quoteId, isFavorite: true });
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [sessionId, setFavorites]);
}
```

- [ ] **Step 2: Wire it into `ExperienceRoot.tsx` and remove the duplicated effects**

In `components/experience/ExperienceRoot.tsx`:

1. Change the import line:

```ts
import { loadFavorites, mergeFavoriteIds, saveFavorites } from "@/lib/utils/local-favorites";
```

to:

```ts
import { saveFavorites } from "@/lib/utils/local-favorites";
```

(`saveFavorites` is still used by `handleFavorite`/`handleRemoveFavorite`; `loadFavorites`/`mergeFavoriteIds` are no longer used directly in this file.)

2. Change the import line:

```ts
import { fetchFavorites, postFavorite, postInteraction } from "@/lib/client/interactions-api";
```

to:

```ts
import { postFavorite, postInteraction } from "@/lib/client/interactions-api";
```

3. Add a new import (near the other hook imports):

```ts
import { useFavoritesSync } from "@/hooks/useFavoritesSync";
```

4. Right after the line `const emotionalSession = useEmotionalSession(sessionId);`, add:

```ts
  useFavoritesSync(sessionId);
```

5. Delete these two `useEffect` blocks entirely (they are now inside the hook):

```ts
  useEffect(() => {
    if (!sessionId) {
      return;
    }

    setSessionId(sessionId);
    setFavorites(loadFavorites(sessionId));
  }, [sessionId, setFavorites, setSessionId]);
```

and

```ts
  useEffect(() => {
    if (!sessionId) {
      return;
    }

    let cancelled = false;
    const localFavorites = loadFavorites(sessionId);

    void fetchFavorites(sessionId)
      .then((cloudFavorites) => {
        if (cancelled) {
          return;
        }

        const mergedFavorites = mergeFavoriteIds(localFavorites, cloudFavorites);
        setFavorites(mergedFavorites);
        saveFavorites(sessionId, mergedFavorites);

        const missingInCloud = mergedFavorites.filter((quoteId) => !cloudFavorites.includes(quoteId));
        for (const quoteId of missingInCloud) {
          void postFavorite({ sessionId, quoteId, isFavorite: true });
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [sessionId, setFavorites]);
```

`setSessionId` (from `useQuoteStore`) is still declared and used elsewhere in the file — do not remove that selector line, only the two effects above.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` — expect no errors.
Run: `npx eslint hooks/useFavoritesSync.ts components/experience/ExperienceRoot.tsx` — expect no errors/warnings.
Run: `npm run dev`, open the app, mark a quote as favorite, reload the page — the favorite must still be there (confirms the hook still bootstraps/syncs correctly).

- [ ] **Step 4: Commit**

```bash
git add hooks/useFavoritesSync.ts components/experience/ExperienceRoot.tsx
git commit -m "$(cat <<'EOF'
refactor: extract favorites bootstrap/sync into useFavoritesSync hook

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01KoTFzCCWR5rm9W49aFnvWt
EOF
)"
```

---

### Task 2: Remove time-of-day auto-detection; always start at `"morning"`

**Files:**
- Modify: `lib/theme/scene-variant.ts`
- Modify: `components/experience/ExperienceRoot.tsx`

**Interfaces:**
- Consumes: `SceneVariant` type, `SCENE_VARIANT_TOKENS` (both defined in `lib/theme/scene-variant.ts`, unchanged).
- Produces: `ExperienceRoot`'s `sceneVariant` state now starts at the literal `"morning"` instead of `getSceneVariant()`. The setter is intentionally **not** added yet in this task (it would be unused until Task 3 wires the selector) — keep `const [sceneVariant] = useState<SceneVariant>("morning");`.

- [ ] **Step 1: Remove the auto-detection function**

In `lib/theme/scene-variant.ts`, replace the file header comment and remove `getSceneVariant`:

```ts
/**
 * Variação visual da cena (período do dia).
 *
 * O usuário escolhe a variante manualmente pela top bar (Sol/Tarde/Noite). A
 * árvore sempre abre em "morning" — variante fixa de bootstrap, sem botão
 * próprio no seletor — até o usuário trocar.
 */

export type SceneVariant = "morning" | "day" | "evening" | "night";
```

(Delete the `getSceneVariant(hour = new Date().getHours())` function that follows the type in the current file — everything from `export function getSceneVariant` through its closing `}` goes away. The `SceneVariantTokens` type and `SCENE_VARIANT_TOKENS` constant below it are unchanged.)

- [ ] **Step 2: Update `ExperienceRoot.tsx`**

Change the import line:

```ts
import { getSceneVariant, type SceneVariant } from "@/lib/theme/scene-variant";
```

to:

```ts
import type { SceneVariant } from "@/lib/theme/scene-variant";
```

Change:

```ts
  /** variante sazonal calculada uma vez no bootstrap */
  const [sceneVariant] = useState<SceneVariant>(() => getSceneVariant());
```

to:

```ts
  /** ambiente visual: sempre abre em "morning"; o usuário troca pela top bar (Tarefa 3) */
  const [sceneVariant] = useState<SceneVariant>("morning");
```

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` — expect no errors.
Run: `npx eslint lib/theme/scene-variant.ts components/experience/ExperienceRoot.tsx` — expect no errors.
Run: `npm run dev`, reload the page several times — the sky/lighting must look identical every time (the "morning" palette: cool blue sky `#1A5FA8`→`#D8EAF5`, no stars, low sun `sunIntensity: 2.4`), regardless of your system clock. This is the regression check that auto-detection is really gone.

- [ ] **Step 4: Commit**

```bash
git add lib/theme/scene-variant.ts components/experience/ExperienceRoot.tsx
git commit -m "$(cat <<'EOF'
refactor: drop time-of-day auto-detection, always boot in morning variant

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01KoTFzCCWR5rm9W49aFnvWt
EOF
)"
```

---

### Task 3: Unified top bar (desktop + mobile), replaces all old HUD JSX

This is the largest task: it creates 4 new files and heavily edits `ExperienceRoot.tsx`. It is kept as one task (rather than split desktop/mobile) because splitting it would leave mobile with no controls at all between sub-steps — not an independently reviewable state.

**Files:**
- Create: `components/experience/topBarOptions.ts`
- Create: `components/experience/TopBarSelect.tsx`
- Create: `components/experience/TopBar.tsx`
- Create: `components/experience/TopBarMobile.tsx`
- Modify: `components/experience/ExperienceRoot.tsx`
- Delete: `components/ui/ThemeFilter.tsx`

**Interfaces:**
- Consumes (from earlier tasks / existing code): `SceneVariant` (`lib/theme/scene-variant.ts`), `SensoryMode` (`types/emotional-session.ts`), `ThemeFilter` (`types/quote.ts`), `THEMES` (`data/themes.ts`), `sceneVariant` state from Task 2 (this task adds the setter).
- Produces:
  - `TopBarSelectOption<T extends string> = { value: T; label: string; disabled?: boolean }` (in `topBarOptions.ts`).
  - `THEME_OPTIONS: TopBarSelectOption<ThemeFilter>[]`, `ENVIRONMENT_OPTIONS: TopBarSelectOption<SceneVariant>[]`, `environmentOptionsFor(variant: SceneVariant): TopBarSelectOption<SceneVariant>[]`, `SENSORY_OPTIONS: TopBarSelectOption<SensoryMode>[]` (all in `topBarOptions.ts`).
  - `TopBarSelect<T extends string>(props: { label: string; icon: LucideIcon; value: T; options: TopBarSelectOption<T>[]; onChange: (value: T) => void })` — a compact `hud-pill`-styled `<select>` wrapper.
  - `TopBar(props: TopBarProps)` and `TopBarMobile(props: TopBarMobileProps)` — both share the same prop shape (see Step 3/4 below), consumed once each from `ExperienceRoot`.

- [ ] **Step 1: Shared option lists**

Create `components/experience/topBarOptions.ts`:

```ts
import { THEMES } from "@/data/themes";
import type { SceneVariant } from "@/lib/theme/scene-variant";
import type { SensoryMode } from "@/types/emotional-session";
import type { ThemeFilter } from "@/types/quote";

export type TopBarSelectOption<T extends string> = {
  value: T;
  label: string;
  disabled?: boolean;
};

export const THEME_OPTIONS: TopBarSelectOption<ThemeFilter>[] = [
  { value: "all", label: "Todos os temas" },
  ...THEMES.map((theme) => ({ value: theme.slug, label: theme.label })),
];

export const ENVIRONMENT_OPTIONS: TopBarSelectOption<SceneVariant>[] = [
  { value: "day", label: "Sol" },
  { value: "evening", label: "Tarde" },
  { value: "night", label: "Noite" },
];

/**
 * A árvore sempre abre em "morning", que não é uma opção clicável do
 * seletor. Enquanto o valor atual for "morning", incluímos uma opção
 * desabilitada só para o <select> nativo exibir "Manhã" corretamente até o
 * usuário escolher Sol/Tarde/Noite pela primeira vez.
 */
export function environmentOptionsFor(sceneVariant: SceneVariant): TopBarSelectOption<SceneVariant>[] {
  return sceneVariant === "morning"
    ? [{ value: "morning", label: "Manhã", disabled: true }, ...ENVIRONMENT_OPTIONS]
    : ENVIRONMENT_OPTIONS;
}

export const SENSORY_OPTIONS: TopBarSelectOption<SensoryMode>[] = [
  { value: "default", label: "Completo" },
  { value: "calm", label: "Calmo" },
  { value: "minimal", label: "Mínimo" },
];
```

- [ ] **Step 2: Reusable compact select**

Create `components/experience/TopBarSelect.tsx`:

```tsx
"use client";

import type { LucideIcon } from "lucide-react";

import type { TopBarSelectOption } from "@/components/experience/topBarOptions";

type TopBarSelectProps<T extends string> = {
  label: string;
  icon: LucideIcon;
  value: T;
  options: TopBarSelectOption<T>[];
  onChange: (value: T) => void;
};

/** Dropdown compacto no estilo hud-pill, reaproveitado por TopBar e TopBarMobile. */
export function TopBarSelect<T extends string>({ label, icon: Icon, value, options, onChange }: TopBarSelectProps<T>) {
  return (
    <div className="hud-pill flex h-11 shrink-0 items-center gap-2 px-3 text-[11px] font-semibold text-[#D6E2F0]">
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
        className="bg-transparent text-[11px] text-white outline-none [&>option]:bg-[#101826] [&>option]:text-white"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value} disabled={option.disabled}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
```

- [ ] **Step 3: Desktop top bar**

Create `components/experience/TopBar.tsx`:

```tsx
"use client";

import { Heart, Palette, RefreshCw, SlidersHorizontal, Sun, Volume2, VolumeX } from "lucide-react";

import { TopBarSelect } from "@/components/experience/TopBarSelect";
import { environmentOptionsFor, SENSORY_OPTIONS, THEME_OPTIONS } from "@/components/experience/topBarOptions";
import type { SceneVariant } from "@/lib/theme/scene-variant";
import type { SensoryMode } from "@/types/emotional-session";
import type { ThemeFilter } from "@/types/quote";

export type TopBarProps = {
  visible: boolean;
  themeFilter: ThemeFilter;
  onThemeChange: (theme: ThemeFilter) => void;
  sceneVariant: SceneVariant;
  onEnvironmentChange: (variant: SceneVariant) => void;
  sensoryMode: SensoryMode;
  onSensoryModeChange: (mode: SensoryMode) => void;
  favoriteCount: number;
  onOpenFavorites: () => void;
  audioEnabled: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onRegenerateTree: () => void;
  onOpenBreathing: () => void;
  onOpenCheckOut: () => void;
};

/** Barra de controles fixa no topo — desktop/tablet (lg e acima). */
export function TopBar({
  visible,
  themeFilter,
  onThemeChange,
  sceneVariant,
  onEnvironmentChange,
  sensoryMode,
  onSensoryModeChange,
  favoriteCount,
  onOpenFavorites,
  audioEnabled,
  muted,
  onToggleMute,
  onRegenerateTree,
  onOpenBreathing,
  onOpenCheckOut,
}: TopBarProps) {
  return (
    <div
      className={`pointer-events-none absolute inset-x-0 top-0 z-20 hidden justify-center px-4 pt-4 transition-opacity duration-300 lg:flex ${
        visible ? "opacity-100" : "invisible opacity-0"
      }`}
    >
      <div className="hud-panel pointer-events-auto flex w-full max-w-[1240px] items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <TopBarSelect label="Tema" icon={Palette} value={themeFilter} options={THEME_OPTIONS} onChange={onThemeChange} />
          <TopBarSelect
            label="Ambiente"
            icon={Sun}
            value={sceneVariant}
            options={environmentOptionsFor(sceneVariant)}
            onChange={onEnvironmentChange}
          />
          <TopBarSelect
            label="Sensações"
            icon={SlidersHorizontal}
            value={sensoryMode}
            options={SENSORY_OPTIONS}
            onChange={onSensoryModeChange}
          />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenFavorites}
            className="hud-pill flex h-11 items-center gap-2 px-3.5 text-[11px] font-semibold text-[#D6E2F0] transition hover:text-white"
          >
            <Heart className="h-4 w-4" aria-hidden />
            Favoritas
            {favoriteCount > 0 ? (
              <span className="rounded-full bg-white/12 px-1.5 py-px text-[10px] font-bold tabular-nums">
                {favoriteCount}
              </span>
            ) : null}
          </button>

          {audioEnabled ? (
            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted ? "Ativar som" : "Silenciar"}
              className="hud-pill flex h-11 w-11 items-center justify-center text-[#93A8BE] transition hover:text-white"
            >
              {muted ? <VolumeX className="h-4 w-4" aria-hidden /> : <Volume2 className="h-4 w-4" aria-hidden />}
            </button>
          ) : null}

          <button
            type="button"
            onClick={onRegenerateTree}
            aria-label="Gerar uma nova árvore"
            className="hud-pill flex h-11 items-center gap-2 px-3.5 text-[11px] font-semibold text-[#D6E2F0] transition hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            Nova árvore
          </button>

          <button
            type="button"
            onClick={onOpenBreathing}
            className="hud-pill flex h-11 items-center px-3.5 text-[11px] font-semibold text-[#D6E2F0] transition hover:text-white"
          >
            Respirar com a folha
          </button>

          <button
            type="button"
            onClick={onOpenCheckOut}
            className="hud-pill flex h-11 items-center px-3.5 text-[11px] font-semibold text-[#D6E2F0] transition hover:text-white"
          >
            Como estou agora?
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Mobile compact bar + overflow menu**

Create `components/experience/TopBarMobile.tsx`:

```tsx
"use client";

import { AnimatePresence, motion } from "motion/react";
import { Heart, MoreHorizontal, Palette, RefreshCw, SlidersHorizontal, Sun, Volume2, VolumeX, X } from "lucide-react";
import { useState } from "react";

import { TopBarSelect } from "@/components/experience/TopBarSelect";
import { environmentOptionsFor, SENSORY_OPTIONS, THEME_OPTIONS } from "@/components/experience/topBarOptions";
import type { SceneVariant } from "@/lib/theme/scene-variant";
import type { SensoryMode } from "@/types/emotional-session";
import type { ThemeFilter } from "@/types/quote";

export type TopBarMobileProps = {
  visible: boolean;
  themeFilter: ThemeFilter;
  onThemeChange: (theme: ThemeFilter) => void;
  sceneVariant: SceneVariant;
  onEnvironmentChange: (variant: SceneVariant) => void;
  sensoryMode: SensoryMode;
  onSensoryModeChange: (mode: SensoryMode) => void;
  favoriteCount: number;
  onOpenFavorites: () => void;
  audioEnabled: boolean;
  muted: boolean;
  onToggleMute: () => void;
  onRegenerateTree: () => void;
  onOpenBreathing: () => void;
  onOpenCheckOut: () => void;
};

/** Barra compacta do topo no mobile: Tema, Ambiente, Favoritas e "Mais opções". */
export function TopBarMobile({
  visible,
  themeFilter,
  onThemeChange,
  sceneVariant,
  onEnvironmentChange,
  sensoryMode,
  onSensoryModeChange,
  favoriteCount,
  onOpenFavorites,
  audioEnabled,
  muted,
  onToggleMute,
  onRegenerateTree,
  onOpenBreathing,
  onOpenCheckOut,
}: TopBarMobileProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <>
      <div
        className={`pointer-events-none absolute inset-x-0 top-0 z-20 flex justify-center px-3 pt-3 transition-opacity duration-300 lg:hidden ${
          visible ? "opacity-100" : "invisible opacity-0"
        }`}
      >
        <div className="hud-panel pointer-events-auto flex w-full max-w-md items-center gap-1.5 px-2 py-1.5">
          <TopBarSelect label="Tema" icon={Palette} value={themeFilter} options={THEME_OPTIONS} onChange={onThemeChange} />
          <TopBarSelect
            label="Ambiente"
            icon={Sun}
            value={sceneVariant}
            options={environmentOptionsFor(sceneVariant)}
            onChange={onEnvironmentChange}
          />

          <button
            type="button"
            onClick={onOpenFavorites}
            aria-label="Favoritas"
            className="hud-pill flex h-11 shrink-0 items-center gap-1.5 px-3 text-[11px] font-semibold text-[#D6E2F0]"
          >
            <Heart className="h-4 w-4" aria-hidden />
            {favoriteCount > 0 ? <span className="tabular-nums">{favoriteCount}</span> : null}
          </button>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-label="Mais opções"
            className="hud-pill flex h-11 w-11 shrink-0 items-center justify-center text-[#D6E2F0]"
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {menuOpen ? (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto fixed inset-0 z-40 bg-black/40"
              aria-hidden
              onClick={() => setMenuOpen(false)}
            />

            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="hud-card pointer-events-auto fixed inset-x-0 bottom-0 z-40 rounded-t-[28px] rounded-b-none p-0 pb-[env(safe-area-inset-bottom,0px)]"
              role="dialog"
              aria-label="Mais opções"
            >
              <div className="flex items-center justify-between px-5 pb-2 pt-4">
                <p className="text-[11px] font-semibold tracking-[0.18em] uppercase text-[#D5E1EF]">Mais opções</p>
                <button
                  type="button"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Fechar menu"
                  className="hud-pill flex h-10 w-10 items-center justify-center text-[#DCE8F5]"
                >
                  <X className="h-4 w-4" aria-hidden />
                </button>
              </div>

              <div className="hud-divider mx-5" />

              <div className="flex flex-col gap-2 px-5 py-4">
                {audioEnabled ? (
                  <button
                    type="button"
                    onClick={() => {
                      onToggleMute();
                      setMenuOpen(false);
                    }}
                    className="hud-list-item flex items-center gap-3 px-4 py-3.5 text-left text-sm text-[#F2F6FC]"
                  >
                    {muted ? <VolumeX className="h-4 w-4" aria-hidden /> : <Volume2 className="h-4 w-4" aria-hidden />}
                    {muted ? "Ativar som" : "Silenciar"}
                  </button>
                ) : null}

                <button
                  type="button"
                  onClick={() => {
                    onRegenerateTree();
                    setMenuOpen(false);
                  }}
                  className="hud-list-item flex items-center gap-3 px-4 py-3.5 text-left text-sm text-[#F2F6FC]"
                >
                  <RefreshCw className="h-4 w-4" aria-hidden />
                  Nova árvore
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onOpenBreathing();
                    setMenuOpen(false);
                  }}
                  className="hud-list-item flex items-center gap-3 px-4 py-3.5 text-left text-sm text-[#F2F6FC]"
                >
                  Respirar com a folha
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onOpenCheckOut();
                    setMenuOpen(false);
                  }}
                  className="hud-list-item flex items-center gap-3 px-4 py-3.5 text-left text-sm text-[#F2F6FC]"
                >
                  Como estou agora?
                </button>

                <div className="hud-pill mt-1 flex h-12 items-center justify-between gap-2 px-4 text-[12px] text-[#D6E2F0]">
                  <span className="flex items-center gap-2">
                    <SlidersHorizontal className="h-4 w-4" aria-hidden />
                    Sensações
                  </span>
                  <select
                    aria-label="Sensações"
                    value={sensoryMode}
                    onChange={(event) => onSensoryModeChange(event.target.value as SensoryMode)}
                    className="bg-transparent text-[12px] text-white outline-none [&>option]:bg-[#101826] [&>option]:text-white"
                  >
                    {SENSORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>
          </>
        ) : null}
      </AnimatePresence>
    </>
  );
}
```

- [ ] **Step 5: Wire both into `ExperienceRoot.tsx`, remove old HUD JSX and dead state**

In `components/experience/ExperienceRoot.tsx`:

1. Replace the lucide-react import line:

```ts
import { ChevronRight, Heart, RefreshCw, SlidersHorizontal, Sparkles, Volume2, VolumeX, X } from "lucide-react";
```

with:

```ts
import { Sparkles } from "lucide-react";
```

(`Sparkles` is still used by the mobile FAB button near the bottom of the file. All the other icons were only used inside the HUD JSX this task removes.)

2. Remove these two import lines entirely (the components/functions they bring in are no longer used):

```ts
import { FavoritesDrawer } from "@/components/ui/FavoritesDrawer";
```
— **keep this one**, `FavoritesDrawer` is still rendered later in the file. Only remove:

```ts
import { ThemeFilter } from "@/components/ui/ThemeFilter";
```

3. Add new imports (near the other `@/components/experience/*` imports):

```ts
import { TopBar } from "@/components/experience/TopBar";
import { TopBarMobile } from "@/components/experience/TopBarMobile";
```

4. Remove `THEMES` import if it becomes unused in this file after the JSX removal in step 7 below — check after editing; if `THEMES.find(...)` (used by `themeContextLabel`) still appears in the file, **keep** the `import { THEMES } from "@/data/themes";` line. (It does still appear — `themeContextLabel` uses it — so keep this import unchanged.)

5. Remove the `hudExpanded` / auto-collapse state and effect. Delete:

```ts
  const [hudExpanded, setHudExpanded] = useState(false);
```

Delete:

```ts
  const hudAutoCollapseDoneRef = useRef(false);
```

Delete this whole effect:

```ts
  useEffect(() => {
    if (introLocked || hudAutoCollapseDoneRef.current) {
      return;
    }

    setHudExpanded(true);
    const timeout = window.setTimeout(() => {
      setHudExpanded(false);
      hudAutoCollapseDoneRef.current = true;
    }, 3600);

    return () => window.clearTimeout(timeout);
  }, [introLocked]);
```

6. Remove the now-unused `showIntro` state and its bootstrap/dismiss usage (the top bar has no onboarding checklist — the existing floating hint `"Toque uma folha luminosa"` and the first-hover tooltip `"Toque para abrir"` remain unchanged and keep covering onboarding).

Change:

```ts
  const [showIntro, setShowIntro] = useState(false);
```

to: delete this line entirely.

In the bootstrap effect, change:

```ts
  useEffect(() => {
    migrateLegacyStorage();
    setTreeSeed(createTreeSeed());
    setShowIntro(window.localStorage.getItem(INTRO_STORAGE_KEY) !== "1");
  }, []);
```

to:

```ts
  useEffect(() => {
    migrateLegacyStorage();
    setTreeSeed(createTreeSeed());
  }, []);
```

Change `dismissIntro`:

```ts
  const dismissIntro = useCallback(() => {
    window.localStorage.setItem(INTRO_STORAGE_KEY, "1");
    setShowIntro(false);
  }, []);
```

to:

```ts
  const dismissIntro = useCallback(() => {
    window.localStorage.setItem(INTRO_STORAGE_KEY, "1");
  }, []);
```

`introLocked`, `INTRO_STORAGE_KEY`, and every call site of `dismissIntro()` are unchanged — only the `showIntro` boolean itself and its setter go away.

7. Replace the entire HUD JSX block. Find this block (it starts right after the loading-quotes/message-panel backdrop `<div>` and spans from the `pointer-events-none absolute inset-0 z-20` wrapper through its matching closing `</div>`, i.e. everything from:

```tsx
      {/*
        Com a mensagem aberta o HUD sai de cena: a folha ocupa a tela inteira e
        o painel do canto ficava por cima da lamina, competindo com o texto.
      */}
      <div
        className={`pointer-events-none absolute inset-0 z-20 transition-opacity duration-300 ${
          introLocked || panelOpen ? "opacity-0" : "opacity-100"
        } ${panelOpen ? "invisible" : "visible"}`}
      >
```

through the matching close of that `<div>` — i.e. everything up to and including the two `AnimatePresence` blocks for the floating hint and the hover tooltip, ending at the `</div>` that closes `<div className="relative mx-auto h-full w-full max-w-[1240px] px-4 sm:px-6 lg:px-8">`, followed by the outer `</div>`.

Replace that **entire** block with:

```tsx
      <TopBar
        visible={!introLocked && !panelOpen}
        themeFilter={themeFilter}
        onThemeChange={handleThemeChange}
        sceneVariant={sceneVariant}
        onEnvironmentChange={handleEnvironmentChange}
        sensoryMode={sensoryMode}
        onSensoryModeChange={setSensoryMode}
        favoriteCount={favorites.length}
        onOpenFavorites={() => setFavoritesOpen(true)}
        audioEnabled={process.env.NEXT_PUBLIC_ENABLE_AUDIO === "1"}
        muted={muted}
        onToggleMute={toggleMute}
        onRegenerateTree={regenerateTree}
        onOpenBreathing={() => setBreathingOpen(true)}
        onOpenCheckOut={() => setCheckOutOpen(true)}
      />

      <TopBarMobile
        visible={!introLocked && !panelOpen}
        themeFilter={themeFilter}
        onThemeChange={handleThemeChange}
        sceneVariant={sceneVariant}
        onEnvironmentChange={handleEnvironmentChange}
        sensoryMode={sensoryMode}
        onSensoryModeChange={setSensoryMode}
        favoriteCount={favorites.length}
        onOpenFavorites={() => setFavoritesOpen(true)}
        audioEnabled={process.env.NEXT_PUBLIC_ENABLE_AUDIO === "1"}
        muted={muted}
        onToggleMute={toggleMute}
        onRegenerateTree={regenerateTree}
        onOpenBreathing={() => setBreathingOpen(true)}
        onOpenCheckOut={() => setCheckOutOpen(true)}
      />

      <div
        className={`pointer-events-none absolute inset-0 z-20 transition-opacity duration-300 ${
          introLocked || panelOpen ? "opacity-0" : "opacity-100"
        } ${panelOpen ? "invisible" : "visible"}`}
      >
        <div className="relative mx-auto h-full w-full max-w-[1240px] px-4 sm:px-6 lg:px-8">
          <AnimatePresence>
            {!panelOpen && showHint && !loadingOverlayVisible ? (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 6 }}
                transition={{ duration: 0.3 }}
                className="hud-badge pointer-events-none absolute bottom-28 left-1/2 -translate-x-1/2 px-5 py-2.5 text-[12px] tracking-[0.12em] uppercase text-[#DAE6F4] lg:bottom-24 lg:text-[11px] lg:tracking-[0.14em]"
              >
                {floatingHintLabel}
              </motion.div>
            ) : null}
          </AnimatePresence>

          {/* tooltip de onboarding: aparece no centro da tela no primeiro hover */}
          <AnimatePresence>
            {showHoverTooltip && !panelOpen ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.92, y: 8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 4 }}
                transition={{ duration: 0.28, ease: "easeOut" }}
                className="hud-badge pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-5 py-3 text-[13px] font-semibold tracking-[0.08em] text-[#F5EED8]"
              >
                Toque para abrir
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
```

This keeps the floating hint and hover tooltip exactly as they were (unrelated to the HUD panel), just re-parented one level, and replaces the collapsible corner/sheet HUD with the two new top bar components.

8. Remove the old floating "Nova árvore" button (now in `TopBar`/`TopBarMobile`). Delete:

```tsx
      {!panelOpen ? (
        <button
          type="button"
          onClick={regenerateTree}
          aria-label="Gerar uma nova árvore"
          className="hud-pill pointer-events-auto absolute top-4 right-4 z-30 flex h-11 items-center gap-2 px-4 text-[11px] font-semibold text-[#D6E2F0] backdrop-blur-md transition hover:text-white sm:top-6 sm:right-6"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          <span className="hidden sm:inline">Nova árvore</span>
        </button>
      ) : null}
```

9. Remove the old bottom-right cluster (Respirar / Como estou agora / Sensações, now in `TopBar`/`TopBarMobile`). Delete:

```tsx
      {!panelOpen && !loadingOverlayVisible ? <div className="absolute right-4 bottom-[max(5.5rem,env(safe-area-inset-bottom))] z-30 flex flex-col items-end gap-2 sm:right-6 sm:bottom-6"><button type="button" onClick={() => setBreathingOpen(true)} className="hud-pill h-11 px-4 text-[11px] font-semibold text-[#D6E2F0]">Respirar com a folha</button><button type="button" onClick={() => setCheckOutOpen(true)} className="hud-pill h-11 px-4 text-[11px] font-semibold text-[#D6E2F0]">Como estou agora?</button><label className="hud-pill flex h-10 items-center gap-2 px-3 text-[10px] text-[#D6E2F0]">Sensações<select value={sensoryMode} onChange={(event) => setSensoryMode(event.target.value as SensoryMode)} aria-label="Modo sensorial" className="bg-transparent text-[11px] text-white outline-none"><option value="default">Completo</option><option value="calm">Calmo</option><option value="minimal">Mínimo</option></select></label></div> : null}
```

Do **not** touch the mobile FAB block right after it (`{isMobile && !panelOpen ? (...) : null}` with the `Sparkles` icon) — that stays exactly as-is.

10. Add the environment change handler and make `sceneVariant` settable. Change:

```ts
  /** ambiente visual: sempre abre em "morning"; o usuário troca pela top bar (Tarefa 3) */
  const [sceneVariant] = useState<SceneVariant>("morning");
```

to:

```ts
  /** ambiente visual: sempre abre em "morning"; o usuário troca pela top bar */
  const [sceneVariant, setSceneVariant] = useState<SceneVariant>("morning");
```

Add a new handler next to `handleThemeChange` (same pattern — guard no-op, sound feedback, then update state):

```ts
  const handleEnvironmentChange = useCallback(
    (nextVariant: SceneVariant) => {
      if (nextVariant === sceneVariant) {
        return;
      }

      playClick();
      setSceneVariant(nextVariant);
    },
    [playClick, sceneVariant],
  );
```

- [ ] **Step 6: Delete the superseded `ThemeFilter` component**

```bash
git rm components/ui/ThemeFilter.tsx
```

- [ ] **Step 7: Verify**

Run: `npx tsc --noEmit` — expect no errors (this will catch any leftover reference to removed state/imports).
Run: `npx eslint components/experience components/ui` — expect no errors.
Run: `npm run dev` and manually check, on both a desktop-width and a mobile-width (devtools responsive mode) viewport:
- The top bar shows Tema/Ambiente/Sensações selects and all action buttons; changing Tema still filters leaves; changing Ambiente changes the sky/lighting instantly; changing Sensações still changes wind/particles.
- Favoritas button opens `FavoritesDrawer` with the correct count.
- "Nova árvore" regenerates the tree; "Respirar com a folha" and "Como estou agora?" open their existing dialogs.
- On mobile, the compact bar shows Tema/Ambiente/Favoritas/"⋯"; tapping "⋯" opens the sheet with Som (if `NEXT_PUBLIC_ENABLE_AUDIO=1`)/Nova árvore/Respirar/Como estou agora/Sensações, and each item closes the sheet after acting.
- The top bar disappears while a message panel is open, and reappears when it closes.
- The floating hint ("Toque uma folha luminosa") and the first-hover tooltip ("Toque para abrir") still work as before.

- [ ] **Step 8: Commit**

```bash
git add components/experience/topBarOptions.ts components/experience/TopBarSelect.tsx components/experience/TopBar.tsx components/experience/TopBarMobile.tsx components/experience/ExperienceRoot.tsx
git rm components/ui/ThemeFilter.tsx
git commit -m "$(cat <<'EOF'
feat: replace HUD panel/sheet with a unified top bar (desktop + mobile)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01KoTFzCCWR5rm9W49aFnvWt
EOF
)"
```

---

### Task 4: Richer message-leaf texture + wider color palette

**Files:**
- Modify: `lib/tree/leafArtwork.ts`

**Interfaces:**
- Produces: `buildDetailSvg()` keeps the same signature (no args, returns `string`) — only its internal markup changes, so `createLeafDetailTexture` (unchanged in this task, touched in Task 5) keeps working as-is. `buildLeafPalette(seed: number)` and `leafCanopyColor(seed, target?)` keep their exact signatures — only the internal hue/saturation ranges widen.

- [ ] **Step 1: Widen the color range**

In `lib/tree/leafArtwork.ts`, change `buildLeafPalette`'s comment and ranges:

```ts
/**
 * Tons terrosos CLAROS.
 *
 * A matiz passeia entre a terracota profunda (24deg) e o dourado claro
 * (58deg) e a luminosidade nunca desce do patamar claro: a mensagem e
 * impressa em tinta escura sobre a lamina, entao o contraste precisa estar
 * garantido por construcao, nao por sorte. A variacao mora no croma.
 */
export function buildLeafPalette(seed: number) {
  const random = createLeafRandom(seed);
  const hue = 24 + random() * 34;
  const saturation = 28 + random() * 30;
  const lift = random() * 4;
```

(Everything below `const lift = ...` in this function is unchanged.)

Change `leafCanopyColor` to use the same hue/saturation range:

```ts
/** cor da folha na copa, no espaco linear do three */
export function leafCanopyColor(seed: number, target = new THREE.Color()) {
  const random = createLeafRandom(seed);
  const hue = (24 + random() * 34) / 360;
  const saturation = (28 + random() * 30) / 100;
  // a copa recebe o tom um pouco mais saturado: em escala pequena e contra o
  // verde, o bege claro do cartao sumiria
  return target.setHSL(hue, Math.min(0.62, saturation + 0.1), 0.52);
}
```

(The `Math.min` cap moved from `0.58` to `0.62` to accommodate the wider saturation range without over-clamping — the shape of the formula is otherwise unchanged.)

- [ ] **Step 2: Richer detail texture (gradient tone + pigment blotches), same signature**

Replace the `buildDetailSvg` function with:

```ts
/**
 * SVG da folha-mensagem na copa 3D — mesma técnica de LeafSvg (gradiente de
 * tom, manchas de pigmento, grão), simplificada para ficar monocromática o
 * suficiente para ser multiplicada pela cor de cada instância no
 * InstancedMesh. As manchas usam uma semente fixa (compartilhada pelas 10
 * folhas, que já variam de tom via messageLeafTone) — não são exclusivas por
 * folha, para não exigir dez texturas separadas.
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

  const blotchRandom = createLeafRandom(0x5eaf1eaf);
  const blotches = Array.from({ length: 14 }, () => ({
    cx: 300 + blotchRandom() * 1080,
    cy: 190 + blotchRandom() * 320,
    rx: 26 + blotchRandom() * 74,
    ry: 14 + blotchRandom() * 34,
    rotate: -28 + blotchRandom() * 56,
    opacity: 0.05 + blotchRandom() * 0.09,
  }))
    .map(
      (blotch) =>
        `<ellipse cx="${blotch.cx.toFixed(1)}" cy="${blotch.cy.toFixed(1)}" rx="${blotch.rx.toFixed(1)}" ry="${blotch.ry.toFixed(1)}" fill="#6E5C3E" opacity="${blotch.opacity.toFixed(2)}" transform="rotate(${blotch.rotate.toFixed(1)} ${blotch.cx.toFixed(1)} ${blotch.cy.toFixed(1)})"/>`,
    )
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${LEAF_VIEW_WIDTH}" height="${LEAF_VIEW_HEIGHT}" viewBox="0 0 ${LEAF_VIEW_WIDTH} ${LEAF_VIEW_HEIGHT}">
  <defs>
    <linearGradient id="tone" x1="217" y1="120" x2="1505" y2="586" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#8C8272"/>
      <stop offset="0.18" stop-color="#A79C89"/>
      <stop offset="0.38" stop-color="#CFC5B4"/>
      <stop offset="0.56" stop-color="#DDD3C1"/>
      <stop offset="0.77" stop-color="#CFC5B4"/>
      <stop offset="1" stop-color="#8C8272"/>
    </linearGradient>

    <radialGradient id="lit" cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(705 334) rotate(7.8) scale(512 248)">
      <stop offset="0" stop-color="#FFFFFF" stop-opacity="0.85"/>
      <stop offset="0.45" stop-color="#FFFFFF" stop-opacity="0.35"/>
      <stop offset="1" stop-color="#FFFFFF" stop-opacity="0"/>
    </radialGradient>

    <filter id="grain" x="166" y="79" width="1398" height="588" filterUnits="userSpaceOnUse">
      <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed="42" result="noise"/>
      <feColorMatrix in="noise" type="saturate" values="0" result="mono"/>
      <feComponentTransfer in="mono" result="softNoise">
        <feFuncA type="table" tableValues="0 0.07"/>
      </feComponentTransfer>
      <feBlend in="SourceGraphic" in2="softNoise" mode="soft-light"/>
    </filter>

    <clipPath id="clip">
      <path d="${LEAF_OUTLINE}"/>
    </clipPath>
  </defs>

  <rect width="${LEAF_VIEW_WIDTH}" height="${LEAF_VIEW_HEIGHT}" fill="url(#tone)"/>
  <rect width="${LEAF_VIEW_WIDTH}" height="${LEAF_VIEW_HEIGHT}" fill="url(#lit)"/>

  <g clip-path="url(#clip)" filter="url(#grain)">
    <path d="M275 273C479 170 759 162 1055 218C886 208 675 235 474 327C404 360 315 346 275 273Z" fill="#FFFFFF" opacity="0.4"/>
    <path d="M278 470C548 564 889 572 1218 489C1070 524 897 545 716 543C545 541 397 514 278 470Z" fill="#5A544B" opacity="0.18"/>

    <g clip-path="url(#clip)">${blotches}</g>

    <g fill="none" stroke-linecap="round" opacity="0.9">${veins}${veinlets}${mesh}</g>
    <path d="${LEAF_MIDRIB}" fill="none" stroke="#5F574C" stroke-width="18" stroke-linecap="round"/>
    <path d="${LEAF_MIDRIB_HIGHLIGHT}" fill="none" stroke="#FFFFFF" stroke-width="4" stroke-opacity="0.7" stroke-linecap="round"/>
  </g>
</svg>`;
}
```

(This has the same call sites and same return type as the current implementation — nothing downstream needs to change in this task.)

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit` — expect no errors.
Run: `npx eslint lib/tree/leafArtwork.ts` — expect no errors.
Run: `npm run dev`, open the tree, look closely at a message leaf (the 10 golden ones) — it should show visible tonal gradient and faint mottled pigment patches, not a flat gray silhouette with only vein lines. Open several message cards — the leaf color should visibly vary more between different quotes than before.

- [ ] **Step 3: Commit**

```bash
git add lib/tree/leafArtwork.ts
git commit -m "$(cat <<'EOF'
feat: richer message-leaf texture and wider color palette range

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01KoTFzCCWR5rm9W49aFnvWt
EOF
)"
```

---

### Task 5: Higher-resolution texture + fixed high tessellation for message leaves

**Files:**
- Modify: `components/3d/Foliage.tsx`
- Modify: `lib/tree/leafGeometry.ts`

**Interfaces:**
- Consumes: `createLeafDetailTexture(resolution?: number)` (unchanged signature, from Task 4's file).
- Produces: no signature changes — `createLeafVariants(detail: number): THREE.BufferGeometry[]` keeps returning a 4-element array; only the geometry parameters for index 3 change.

- [ ] **Step 1: Bump texture resolution**

In `components/3d/Foliage.tsx`, change:

```ts
  const [detailTexture] = useState(() => createLeafDetailTexture(512));
```

to:

```ts
  const [detailTexture] = useState(() => createLeafDetailTexture(1024));
```

- [ ] **Step 2: Fixed high tessellation for the message-leaf variant**

In `lib/tree/leafGeometry.ts`, inside `createLeafVariants`, change the 4th (message-leaf) entry from:

```ts
    // folha-mensagem: mais tesselada porque cresce e fica em close
    createLeafGeometry({
      length: 0.33,
      width: 0.175,
      segmentsU: Math.max(5, Math.round(8 * detail)),
      segmentsV: Math.max(8, Math.round(14 * detail)),
      cup: 0.026,
      midrib: 0.016,
      twist: 0.3,
      droop: 0.035,
      waves: 0.04,
      veinStrength: 0.3,
    }),
```

to:

```ts
    // folha-mensagem: tesselação alta fixa — são sempre MESSAGE_LEAF_COUNT (10)
    // folhas, então o custo extra independe do perfil de qualidade (`detail`)
    createLeafGeometry({
      length: 0.33,
      width: 0.175,
      segmentsU: 10,
      segmentsV: 18,
      cup: 0.026,
      midrib: 0.016,
      twist: 0.3,
      droop: 0.035,
      waves: 0.04,
      veinStrength: 0.3,
    }),
```

The first three entries (common-leaf variants 0–2) are unchanged — they still scale with `detail`.

- [ ] **Step 3: Verify**

Run: `npx tsc --noEmit` — expect no errors.
Run: `npx eslint components/3d/Foliage.tsx lib/tree/leafGeometry.ts` — expect no errors.
Run: `npm run dev`, open the app with the browser devtools performance/FPS counter visible (or just observe smoothness), confirm the scene still runs smoothly. Open a message leaf card and rotate the camera close to a message leaf on the tree (zoom in with scroll) — its silhouette should look visibly smoother/more detailed than the common leaves around it, in every quality profile (test by throttling CPU in devtools to force the "safe" profile, or by watching the dev console log line `[arvore] semente ... variante ...` which prints on every scene rebuild).

- [ ] **Step 4: Commit**

```bash
git add components/3d/Foliage.tsx lib/tree/leafGeometry.ts
git commit -m "$(cat <<'EOF'
feat: raise message-leaf texture resolution and fix high tessellation

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01KoTFzCCWR5rm9W49aFnvWt
EOF
)"
```

---

### Task 6: Portrait orientation for `LeafSvg`, mobile card layout, legibility

**Files:**
- Modify: `components/ui/LeafSvg.tsx`
- Modify: `components/ui/LeafMessageCard.tsx`

**Interfaces:**
- Produces: `LeafSvgProps` gains `orientation?: "landscape" | "portrait"` (default `"landscape"` — every other current caller keeps working unchanged). `leafInkColor(id: string)` is unchanged.

- [ ] **Step 1: Portrait orientation in `LeafSvg`**

Replace the full contents of `components/ui/LeafSvg.tsx` with:

```tsx
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
  /**
   * "portrait" gira a mesma arte 90° para um viewBox vertical nativo — usado
   * no card mobile, no lugar do antigo `transform: rotate(-90deg)` em CSS.
   */
  orientation?: "landscape" | "portrait";
};

export function LeafSvg({ id, className, orientation = "landscape" }: LeafSvgProps) {
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

  const artwork = (
    <>
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
          <stop offset="0" stopColor={palette.glow} stopOpacity="1" />
          <stop offset="0.6" stopColor={palette.glow} stopOpacity="0.72" />
          <stop offset="1" stopColor={palette.glow} stopOpacity="0" />
        </radialGradient>

        <filter id={`${id}-shadow`} x="-8%" y="-24%" width="118%" height="156%">
          <feDropShadow dx="0" dy="18" stdDeviation="20" floodColor="#0A1207" floodOpacity="0.42" />
        </filter>

        {/* grao: fractalNoise em soft-light da a lamina a aspereza do papel */}
        <filter id={`${id}-grain`} x="166" y="79" width="1398" height="588" filterUnits="userSpaceOnUse">
          <feTurbulence type="fractalNoise" baseFrequency="0.75" numOctaves="2" seed={seed % 100} result="noise" />
          <feColorMatrix in="noise" type="saturate" values="0" result="mono" />
          <feComponentTransfer in="mono" result="softNoise">
            <feFuncA type="table" tableValues="0 0.07" />
          </feComponentTransfer>
          <feBlend in="SourceGraphic" in2="softNoise" mode="soft-light" />
        </filter>

        <clipPath id={`${id}-clip`}>
          <path d={LEAF_OUTLINE} />
        </clipPath>
      </defs>

      {/* peciolo */}
      <path
        d="M80 388C122 377 171 367 232 362"
        stroke={`url(#${id}-stem)`}
        strokeWidth="18"
        strokeLinecap="round"
        fill="none"
      />

      <g filter={`url(#${id}-shadow)`}>
        <path d={LEAF_OUTLINE} fill={`url(#${id}-blade)`} stroke={`url(#${id}-edge)`} strokeWidth="4.5" />

        <g clipPath={`url(#${id}-clip)`} filter={`url(#${id}-grain)`}>
          <rect x="166" y="79" width="1398" height="588" fill={`url(#${id}-inner)`} />

          {/* volume: a metade superior pega luz, a inferior recolhe */}
          <path
            d="M275 273C479 170 759 162 1055 218C886 208 675 235 474 327C404 360 315 346 275 273Z"
            fill={palette.glow}
            opacity="0.34"
          />
          <path
            d="M278 470C548 564 889 572 1218 489C1070 524 897 545 716 543C545 541 397 514 278 470Z"
            fill={palette.edge}
            opacity="0.12"
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
            strokeOpacity="0.12"
            strokeWidth="42"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M220 357C645 370 1114 386 1526 398"
            stroke={palette.glow}
            strokeOpacity="0.5"
            strokeWidth="20"
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

          <g stroke={`url(#${id}-veinlet)`} strokeLinecap="round" fill="none" strokeWidth="1.7">
            {LEAF_VEINLETS_UPPER.map((path, index) => (
              <path key={`nu-${index}`} d={path} />
            ))}
            {LEAF_VEINLETS_LOWER.map((path, index) => (
              <path key={`nl-${index}`} d={path} />
            ))}
          </g>

          <g stroke={palette.vein} strokeOpacity="0.2" strokeLinecap="round" fill="none" strokeWidth="1.1">
            {LEAF_VEIN_MESH.map((path, index) => (
              <path key={`mesh-${index}`} d={path} />
            ))}
          </g>

          {/*
            A nervura central entra ANTES da pagina da mensagem: a lamina
            clareia por cima dela no miolo, entao o traco atravessa a folha
            inteira mas nao corta as linhas do texto ao meio.
          */}
          <path d={LEAF_MIDRIB} stroke={`url(#${id}-midrib)`} strokeWidth="12" strokeLinecap="round" fill="none" />
          <path
            d={LEAF_MIDRIB_HIGHLIGHT}
            stroke={palette.glow}
            strokeOpacity="0.55"
            strokeWidth="2.3"
            strokeLinecap="round"
            fill="none"
          />

          {/* pagina da mensagem: clareia o centro sem apagar as nervuras */}
          <ellipse cx="860" cy="368" rx="510" ry="205" fill={`url(#${id}-page)`} />
          <ellipse cx="860" cy="368" rx="400" ry="140" fill={`url(#${id}-page)`} opacity="0.82" />
        </g>
      </g>
    </>
  );

  const viewBoxWidth = orientation === "portrait" ? LEAF_VIEW_HEIGHT : LEAF_VIEW_WIDTH;
  const viewBoxHeight = orientation === "portrait" ? LEAF_VIEW_WIDTH : LEAF_VIEW_HEIGHT;

  return (
    <svg
      viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
      className={className}
      aria-hidden
      focusable="false"
    >
      {orientation === "portrait" ? (
        <g transform={`translate(0, ${LEAF_VIEW_WIDTH}) rotate(-90)`}>{artwork}</g>
      ) : (
        artwork
      )}
    </svg>
  );
}
```

(Every path/gradient/filter definition is byte-for-byte the same as before, just wrapped in an `artwork` fragment and conditionally rotated. The two "page" clearing ellipses get bigger radii and stronger opacity per the legibility requirement — `rx="470"→"510"`, `ry="185"→"205"`, `rx="360"→"400"`, `ry="120"→"140"`, second-ellipse `opacity="0.75"→"0.82"`, and the `${id}-page` gradient stops go from `0.9/0.55/0` to `1/0.72/0`.)

- [ ] **Step 2: Use portrait orientation on mobile in `LeafMessageCard`, drop the CSS rotate hack**

In `components/ui/LeafMessageCard.tsx`, change:

```ts
  const leafWidth = isMobile ? "min(150vh, 168vw)" : "min(82vw, 1240px)";
  const textWidth = isMobile ? "min(70vw, 400px)" : "min(38vw, 600px)";
  const textMarginLeft = isMobile ? "0" : "1.6%";
  const textMarginTop  = isMobile ? "1.0%" : "0.6%";
```

to:

```ts
  const leafWidth = isMobile ? "min(78vw, 32vh)" : "min(82vw, 1240px)";
  const textWidth = isMobile ? "min(70vw, 400px)" : "min(38vw, 600px)";
  const textMarginLeft = isMobile ? "0" : "1.6%";
  const textMarginTop  = isMobile ? "1.0%" : "0.6%";
```

Change the leaf wrapper `<div>`:

```tsx
            <div
              className="relative flex items-center justify-center"
              style={{ width: leafWidth, transform: isMobile ? "rotate(-90deg)" : undefined }}
            >
```

to:

```tsx
            <div className="relative flex items-center justify-center" style={{ width: leafWidth }}>
```

Change the `<LeafSvg>` usage:

```tsx
                <LeafSvg id={leafId} className="w-full" />
```

to:

```tsx
                <LeafSvg id={leafId} className="w-full" orientation={isMobile ? "portrait" : "landscape"} />
```

- [ ] **Step 3: Verify (includes a visual tuning pass)**

Run: `npx tsc --noEmit` — expect no errors.
Run: `npx eslint components/ui/LeafSvg.tsx components/ui/LeafMessageCard.tsx` — expect no errors.
Run: `npm run dev`, open devtools responsive mode at a phone width (e.g. 390×844), tap a message leaf. The leaf artwork must render tall and upright (petiole at the bottom, tip at the top), fully visible without being cropped at the top or bottom of the screen, with the message text centered and legible over it. **If the leaf is cropped, too small, or too large, adjust the `min(78vw, 32vh)` constant in `leafWidth` (mobile branch) and re-check** — this is a visual/responsive value that needs eyeballing in the actual viewport, the same way the original constants in this file were hand-tuned. Also confirm the desktop card (unaffected by this task's logic beyond the `orientation` prop, which defaults to `"landscape"`) still looks exactly as before.

- [ ] **Step 4: Commit**

```bash
git add components/ui/LeafSvg.tsx components/ui/LeafMessageCard.tsx
git commit -m "$(cat <<'EOF'
feat: native portrait orientation for mobile leaf card, stronger text legibility

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01KoTFzCCWR5rm9W49aFnvWt
EOF
)"
```

---

### Task 7: More font variety in the message card

**Files:**
- Modify: `components/ui/LeafMessageCard.tsx`

**Interfaces:**
- Produces: `MESSAGE_FONTS` grows from 3 to 6 entries; `MESSAGE_FONTS[quote ? hashText(quote.id) % MESSAGE_FONTS.length : 0]` (the only consumer) needs no code change — `% MESSAGE_FONTS.length` already adapts to the new length.

- [ ] **Step 1: Expand the font list**

In `components/ui/LeafMessageCard.tsx`, change:

```ts
const MESSAGE_FONTS = [
  { family: "var(--font-display), Georgia, serif", size: 1, tracking: "0em", weight: 600 },
  { family: "var(--font-display-alt), Georgia, serif", size: 0.9, tracking: "0.005em", weight: 500 },
  { family: "var(--font-hand), cursive", size: 1.16, tracking: "0.01em", weight: 600 },
] as const;
```

to:

```ts
const MESSAGE_FONTS = [
  { family: "var(--font-display), Georgia, serif", size: 1, tracking: "0em", weight: 600 },
  { family: "var(--font-display), Georgia, serif", size: 0.96, tracking: "0.015em", weight: 700 },
  { family: "var(--font-display-alt), Georgia, serif", size: 0.9, tracking: "0.005em", weight: 500 },
  { family: "var(--font-display-alt), Georgia, serif", size: 0.86, tracking: "0.02em", weight: 600 },
  { family: "var(--font-hand), cursive", size: 1.16, tracking: "0.01em", weight: 600 },
  { family: "var(--font-hand), cursive", size: 1.22, tracking: "0em", weight: 700 },
] as const;
```

All 6 weights used (`500`, `600`, `700` for `--font-display`/`--font-hand`; `500`, `600` for `--font-display-alt`) are already loaded in `app/layout.tsx` — no font-loading changes needed.

- [ ] **Step 2: Verify**

Run: `npx tsc --noEmit` — expect no errors.
Run: `npx eslint components/ui/LeafMessageCard.tsx` — expect no errors.
Run: `npm run dev`, open several different message leaves in a row — the typography (family/weight/size/tracking) should visibly vary more than before across different quotes, and no console warnings about a missing font weight should appear.

- [ ] **Step 3: Commit**

```bash
git add components/ui/LeafMessageCard.tsx
git commit -m "$(cat <<'EOF'
feat: expand message card font variety from 3 to 6 combinations

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01KoTFzCCWR5rm9W49aFnvWt
EOF
)"
```

---

## Self-Review

**Spec coverage:**
- §1 (refactor de `ExperienceRoot.tsx`) → Tasks 1 and 3 (favorites hook extracted, HUD JSX moved to `TopBar`/`TopBarMobile`).
- §2 (top bar unificada, desktop + mobile) → Task 3.
- §3 (ambiente Sol/Tarde/Noite, boot em morning, sem persistência) → Tasks 2 and 3.
- §4.1/§4.2 (fidelidade 3D: textura rica + tesselação fixa + paleta ampla) → Tasks 4 and 5.
- §4.3 (cartão: legibilidade, orientação portrait real, mais fontes) → Tasks 6 and 7.
- "Fora de escopo" (sem testes, sem mudança em `app/api/*`, sem persistência) → honored throughout; called out in Global Constraints.

**Placeholder scan:** no TBD/TODO, no "add appropriate X", every step shows complete code or an exact copy-paste-able shell command.

**Type consistency:** `TopBarSelectOption<T>`, `TopBarProps`, `TopBarMobileProps` are defined once (Task 3, Steps 1/3/4) and used with matching field names in `ExperienceRoot.tsx`'s JSX (Task 3, Step 5) — `onEnvironmentChange`/`onSensoryModeChange`/`onThemeChange` names match between the components and the call sites. `SceneVariant`, `SensoryMode`, `ThemeFilter` types are imported from their existing source files everywhere, never redefined. `orientation?: "landscape" | "portrait"` in `LeafSvgProps` (Task 6) matches the value passed from `LeafMessageCard` (`isMobile ? "portrait" : "landscape"`).
