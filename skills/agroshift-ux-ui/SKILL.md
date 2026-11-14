---
name: agroshift-ux-ui
description: "Trigger: UX/UI AgroShift, interfaz, dashboard, mapa visual, responsive, usabilidad. Mejora la experiencia sin romper los flujos existentes."
license: Apache-2.0
metadata:
  author: "agroshift-ai"
  version: "1.0"
---

## Activation Contract

Load for UX/UI audits, screen redesigns, responsive work, visual style changes, or interaction improvements in `frontent`.

## Hard Rules

- Inspect the current screen and its call path before editing.
- Prefer incremental improvements over full redesigns unless explicitly requested.
- Preserve existing navigation, data contracts, and domain terminology.
- Design mobile-first, then verify desktop behavior.
- Every new state needs loading, empty, error, success, and offline behavior where applicable.
- Do not use color as the only status signal; include text or icons.

## Decision Gates

| Situation | Action |
|---|---|
| Existing flow works but is dense | Improve hierarchy, spacing, copy, and progressive disclosure. |
| User asks for a style reference | Extract tokens and patterns; do not copy markup literally. |
| Change affects shared components | Update the design system before duplicating styles. |
| Visual change risks behavior | Keep the behavior and change presentation only. |

## Execution Steps

1. Identify the primary user goal and the current friction.
2. Inspect the screen, shared components, state, and responsive constraints.
3. Make the smallest coherent visual/interaction slice.
4. Check keyboard focus, contrast, touch targets, and reduced motion.
5. Run `cd frontent && npm run lint` and `npm run build`.

## Output Contract

Return the changed files, user-visible behavior, verification results, and any remaining UX risk. Do not claim visual validation without a browser check.

## References

- `AGENTS.md`
- `frontent/src/index.css`
- `frontent/src/components/ui/index.tsx`
