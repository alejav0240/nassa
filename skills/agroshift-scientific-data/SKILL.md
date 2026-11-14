---
name: agroshift-scientific-data
description: "Trigger: NASA POWER, datos satelitales, indicadores, métricas agrícolas, heurísticas, incertidumbre. Comunica evidencia y límites sin fabricar resultados."
license: Apache-2.0
metadata:
  author: "agroshift-ai"
  version: "1.0"
---

## Activation Contract

Load for climate data, satellite indicators, rotation scores, scientific copy, data quality, methodology, or result interpretation.

## Hard Rules

- Keep NASA/API failures visible; never fabricate climate values.
- Label every value as observed, estimated, simulated, heuristic, unavailable, or pending.
- Show source, date/period, unit, spatial resolution, and relevant uncertainty.
- Never present heuristic scores as yield, income, or agronomic predictions.
- Do not display zero as a substitute for missing data; use `N/D` or an explicit pending state.
- Preserve limitations and local-validation guidance near the result, not only in documentation.

## Decision Gates

| Data state | UI treatment |
|---|---|
| Real backend result | Show value, source, period, and quality. |
| Demo or simulated value | Mark it visibly as demonstrative. |
| Missing value | Show `N/D` and explain how to obtain it. |
| Heuristic recommendation | Show score plus rationale, risks, and validation caveat. |

## Execution Steps

1. Trace the source service, schema, transformation, and consuming component.
2. Preserve provenance and uncertainty in the typed model.
3. Design readable metric, chart, and empty/error states.
4. Audit wording for scientific overclaiming.
5. Run focused backend tests and frontend lint/build.

## Output Contract

Return data sources, labels/limitations added, missing-data behavior, and verification results.

## References

- `README.md`
- `backend/app/services/nasa.py`
- `backend/app/services/rotation.py`
- `frontent/src/types/agroterra.ts`
