# Complete AgroShift user flows and UX
Branch: feat/complete-ux-flows | Delivery: inline, incremental | Checks: `npm run lint && npm run test && npm run build`

## Specs

1. **S1 — Navigation continuity:** "revisa todos los flujos y analiza si la interfaz en intuitiva para el usuario y que cosas mas podemos agregar o modificar o redisiñear". Navigation between home, map, parcels, detail, analysis, profile, and alerts must preserve context and support browser back/forward and refresh recovery.
2. **S2 — Accessible overlays:** Modal, drawer, confirmation, scanner, and form flows must provide focus management, Escape handling, restored focus, and clear dialog semantics.
3. **S3 — Sync feedback:** Parcel create, update, and delete flows must expose saving, saved, pending, retryable error, and offline states without hiding failures in another screen.
4. **S4 — Parcel detail actions:** The detail flow must expose contextual edit, delete, analysis, history, and location actions without forcing users back to the parcel list.
5. **S5 — Decision-first analysis:** Analysis must prioritize the recommended action and confidence before technical evidence, while retaining access to satellite, fusion, sources, insights, and history.
6. **S6 — Empty and responsive states:** Empty, filtered-empty, loading, error, offline, and mobile states must explain the next action and avoid content/control overlap.
7. **S7 — Consistent product language:** Navigation, charts, alerts, and contextual help must use consistent AgroShift terminology and accessible text alternatives.

## Tasks

- T1 — S1 — delegated — complete — query navigation, refresh recovery, popstate, and context preservation verified
- T2 — S2 — delegated — complete — shared dialog focus, Escape, focus restoration, and scroll locking
- T3 — S3 — delegated — complete — visible sync states with retained retry operation
- T4 — S4 — delegated — complete — direct edit, delete, analysis, history, and location actions
- T5 — S5 — delegated — complete — decision-first analysis and contextual loading/error/stale states
- T6 — S6-S7 — delegated — complete — differentiated empty states, mobile spacing, and map accessibility label
- T7 — inline — complete — lint, tests, build, diff check, and mobile browser flow verification

## Log

- L1 (2026-11-15): "revisa todos los flujos y analiza si la interfaz en intuitiva para el usuario y que cosas mas podemos agregar o modificar o redisiñear"
- L2 (2026-11-15): "arma las mejoras de todos esos puntos"
- Audit evidence: primary flows are discoverable, but navigation is state-only, overlays lack complete focus handling, sync failures are easy to miss, detail lacks direct CRUD actions, empty states are inconsistent, analysis is cognitively dense, and mobile map/bottom-sheet overlap is possible.
- Implementation evidence: all seven implementation units are present in the working tree. Browser validation at 390x844 confirmed URL state for parcels/detail/analysis, detail actions, terrain rendering, five analysis tabs, dialog initial focus on the parcel name field, Escape close, and zero console errors.
- Verification evidence: `npm run lint`, `npm run test`, `npm run build`, and `git diff --check` pass. Build retains the known Three.js chunk-size warning. Native review assessment was unassessable because the working tree contains untracked files requiring explicit inventory; no delivery review was started.
