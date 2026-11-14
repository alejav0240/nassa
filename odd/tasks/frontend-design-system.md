# Frontend design system and visual alignment

Objective: align the frontend with the supplied AgroShift AI mobile-first visual reference and establish reusable design tokens and primitives. Branch: `main`. Delivery: single reviewable implementation commit. Test runner: `npm run lint` and `npm run build` from `frontent/`.

## Specs

1. **S1 — Visual direction:** “arma un plan de mejora del fronent basado en estps disenio y crea el desing system”. The system must reflect the reference image's agricultural identity: deep forest green, fresh leaf green, warm neutral canvas, rounded cards, strong mobile hierarchy, clear source/status indicators, and responsive desktop navigation.
2. **S2 — Reusable tokens:** Define centralized color, typography, spacing, radius, shadow, motion, and focus tokens that components can consume without repeating raw visual values.
3. **S3 — Reusable primitives:** Create accessible primitives for buttons, cards, badges, section headings, fields, metrics, notices, and navigation states. Preserve keyboard focus and reduced-motion behavior.
4. **S4 — Reference page:** Create an internal design-system screen that exposes the tokens and primitives as a living reference for future frontend work.
5. **S5 — Improvement plan:** Document the staged frontend improvement plan and identify what is in scope now versus later.

## Tasks

- T1 (S1, S5) — inline — complete — create the visual plan and design-system documentation.
- T2 (S2, S3, S4) — inline — complete — implement tokens, primitives, and living reference screen.
- T3 (S2-S4) — inline — complete — `npm run lint` passed; `npm run build` passed with existing Vite warnings.

## Log

### L1 — User request

“ahora arma un plan de mjeora del fronent basado en estps disenio y crea el desing system”

### L2 — Initial evidence

The active frontend is `frontent/`, a Vite React application with multiple screens and inline Tailwind utility classes. The repository also contains `frontend--resp/`, an older Next.js response-oriented frontend. The implementation target is `frontent/` because it is the active application entrypoint (`src/App.tsx`).

### L3 — Route

Direct inline implementation. No independent writer is required because the design-system work is one cohesive behavior with shared token and primitive surfaces.

### L4 — Implementation evidence

Added `frontent/src/design-system/tokens.ts`, reusable primitives in `frontent/src/components/ui/index.tsx`, the living reference at `frontent/src/screens/DesignSystemScreen.tsx`, and the `#design-system` entry in `frontent/src/App.tsx`. Added the user-facing plan and usage guide in `frontent/DESIGN_SYSTEM.md`.

### L5 — Verification

`npm run lint` passed. `npm run build` passed and produced the Vite bundle. Vite reported existing warnings about `__dirname` in `vite.config.ts` and a large JavaScript chunk; neither blocked the build.
