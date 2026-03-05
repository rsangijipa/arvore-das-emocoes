# QA Visual Checklist

Use this before demos and releases.

## Desktop (1440 / 1280 / 1024)

- Hero title does not overlap theme chips or CTA row.
- Utility pills stay aligned on the right and keep equal height.
- Quote panel and favorites drawer open below the header area.
- Hovering leaves changes cursor to pointer and gives subtle visual response.
- Selecting a leaf triggers micro camera focus without losing full tree context.
- Closing panel returns camera to calm base framing.

## Mobile (390x844 / 375x812)

- Primary CTA appears as full-width action in header area.
- Theme chips scroll horizontally without wrapping.
- Bottom sheet opens smoothly and can be closed with swipe down.
- Floating CTA at bottom right does not overlap sheet controls.
- Text remains readable with safe-area padding.

## Interaction Flows

- Flow A: enter -> hover/touch leaf -> select leaf -> read quote -> close.
- Flow B: enter -> "Receber mensagem do momento" -> quote opens.
- Flow C: select theme -> random quote respects active theme.
- Flow D: favorite quote -> feedback appears -> quote listed in favorites drawer.

## Accessibility & Comfort

- Keyboard `Escape` closes open panel or favorites drawer.
- Focus ring visible on action buttons and chips.
- Favorite feedback is announced via `aria-live`.
- Reduced motion toggle changes movement intensity.

## Visual Quality Gates

- Crown reads as canopy mass, not sparse spikes.
- Branches read as sculpted forms, not faceted tubes.
- Highlights are controlled; no blown-out white zones.
- Ground base stays supportive and visually secondary.
- Overall mood remains calm and contemplative.
