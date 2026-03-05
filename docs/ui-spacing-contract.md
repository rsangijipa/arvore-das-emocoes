# UI Spacing Contract

This contract locks the HUD rhythm to avoid regressions.

## Breakpoints

- `mobile`: `< 640px`
- `tablet`: `640px - 1023px`
- `desktop`: `>= 1024px`

## Container

- max width: `1240px`
- horizontal padding:
  - mobile: `16px`
  - tablet: `24px`
  - desktop: `32px`

## Header

- top padding:
  - mobile: `16px`
  - tablet: `24px`
  - desktop: `28px`
- grid: `12 cols`
- grid gap: `16px`

## Hero Text

- title max width: `18ch`
- title sizes:
  - mobile: `text-3xl`
  - tablet: `text-4xl`
  - desktop: `text-5xl`
  - large desktop: `text-6xl`

## Theme Chips

- row mode: horizontal scroll
- chip height: `36px`
- chip radius: `9999px`
- chip text: `10-11px uppercase`

## CTA Buttons

- primary:
  - mobile: `h-11 w-full`
  - tablet/desktop: `h-10 w-auto`
- secondary/tertiary: `h-10`
- gap between CTAs: `8px mobile`, `12px tablet+`

## Utility Pills (top-right)

- height: `36px`
- mobile: `flex-1`
- tablet/desktop: intrinsic width

## Intro Card

- max width: `360px`
- padding: `16px`
- placement: `left/bottom` with safe margin

## Floating Hint

- bottom offset: `96px`
- style: rounded full + blur + subtle border

## Side Panels

- quote panel top offset:
  - desktop: `152px`
  - large desktop: `166px`
- favorites drawer top offset:
  - desktop: `152px`
  - large desktop: `166px`

## Mobile Sheet

- main action button heights: `44px`
- close chip height: `32px`
