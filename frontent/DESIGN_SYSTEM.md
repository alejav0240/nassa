# AgroShift AI — Frontend design system

The design system translates the supplied mobile reference into reusable visual rules for the AgroShift AI frontend: a calm agricultural canvas, forest-green actions, source-aware data cards, and touch-friendly layouts.

## Quick path

1. Import primitives from `src/components/ui`.
2. Use values from `src/design-system/tokens.ts` for new components.
3. Prefer the `ds-*` classes in `src/index.css` over new raw color, radius, or shadow values.
4. Open `/#design-system` in the Vite app to inspect the living reference.

## Visual foundation

| Area | Rule |
|---|---|
| Color | Forest green communicates action and trust; leaf/lime tones communicate growth; sky, amber, and danger tones communicate data status. |
| Typography | Plus Jakarta Sans is the interface voice. Large headings use tight tracking and short lines; numeric values use tabular, high-contrast treatment. |
| Shape | Use 10–14px controls, 20px cards, and 28px hero surfaces. Pills are reserved for statuses and filters. |
| Depth | Use a single soft card shadow; reserve the floating shadow for overlays and important surfaces. |
| Interaction | Primary actions have a clear verb, a minimum 44px touch target, visible keyboard focus, and reduced-motion support. |
| Data trust | Show value, unit, source, and scope together. Demo or regional data must be labeled rather than presented as a precise field measurement. |

## Component inventory

- `Button`: `primary`, `secondary`, `ghost`, and `danger` variants with `sm`, `md`, and `lg` sizes.
- `Card`: shared surface and border treatment for content blocks.
- `Badge`: `success`, `warning`, `danger`, `info`, and `neutral` states.
- `SectionHeading`: eyebrow, title, and supporting description hierarchy.
- `Field`: labeled input with hint and validation error states.
- `MetricCard`: value, source, and contextual icon for climate and parcel indicators.
- `Notice`: visible caveats and validation states.
- `NavItem`: active, hover, and keyboard-focus navigation state.
- `BrandMark`: shared AgroShift AI identity treatment.

## Improvement plan

### Phase 1 — Foundation (implemented)

- Establish centralized design tokens.
- Add accessible primitives and a living reference screen.
- Align the visual language with the supplied onboarding, dashboard, parcel, climate, and results views.

### Phase 2 — Product shell

- Replace repeated inline navigation styles with shared navigation primitives.
- Standardize headers, bottom navigation, page padding, and empty states.
- Add a consistent responsive breakpoint contract for mobile, tablet, and desktop.

### Phase 3 — Data trust and domain patterns

- Unify metric cards, source badges, confidence notices, and risk legends.
- Make every external data source expose origin, resolution, period, and limitation.
- Align chart, map, and result components to the same semantic status colors.

### Phase 4 — Production quality

- Add component-level visual regression coverage.
- Add accessibility checks for keyboard navigation, contrast, labels, and reduced motion.
- Split large screen bundles and lazy-load maps, charts, and analysis modules.

## Out of scope for this pass

- Replacing the existing data services.
- Claiming that demo satellite values are live measurements.
- Rebuilding every existing screen in one change.
