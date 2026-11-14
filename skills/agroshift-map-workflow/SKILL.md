---
name: agroshift-map-workflow
description: "Trigger: mapa AgroShift, dibujar parcela, seleccionar área, polígono, GeoJSON, captura de terreno. Implementa flujos geoespaciales seguros y comprensibles."
license: Apache-2.0
metadata:
  author: "agroshift-ai"
  version: "1.0"
---

## Activation Contract

Load for changes to map selection, polygon drawing, parcel registration, geometry review, area calculation, or parcel 3D visualization.

## Hard Rules

- Treat a map click, polygon draft, saved geometry, and selected parcel as separate states.
- Require at least three vertices and validate area before registration.
- Show calculated hectares, centroid, vertex count, and a review step before saving.
- Close GeoJSON rings and preserve `[longitude, latitude]` ordering at the API boundary.
- Keep the user able to undo, cancel, or continue editing without losing the draft.
- Explain that the polygon is referential when no surveyed boundary exists.

## Decision Gates

| Situation | Action |
|---|---|
| Existing parcel selected | Show selection feedback and offer detail/analysis actions. |
| New parcel drawing | Use draft state, review geometry, then collect metadata. |
| Invalid or tiny polygon | Block save and explain the correction. |
| Backend unavailable | Preserve the draft locally and show synchronization status. |

## Execution Steps

1. Trace `MapScreen`, state callbacks, geometry utilities, and backend payload mapping.
2. Add or verify explicit drawing, review, and save states.
3. Test polygon closure, area, centroid, cancellation, and retry behavior.
4. Verify touch controls, map overlays, keyboard alternatives, and mobile occlusion.
5. Run frontend lint/build and relevant backend validation tests.

## Output Contract

Return the flow changed, geometry validation rules, API mapping, and verification results.

## References

- `frontent/src/screens/MapScreen.tsx`
- `frontent/src/components/ParcelFormModal.tsx`
- `frontent/src/utils/geo.ts`
- `backend/app/schemas.py`
