---
name: agroshift-backend-integration
description: "Trigger: conectar frontend backend AgroShift, FastAPI, API fields, sincronización, CRUD, análisis. Integra React con contratos reales y fallback controlado."
license: Apache-2.0
metadata:
  author: "agroshift-ai"
  version: "1.0"
---

## Activation Contract

Load for frontend API clients, FastAPI endpoints, CRUD persistence, analysis requests, synchronization, or backend error handling.

## Hard Rules

- Read the FastAPI route and Pydantic schema before creating a client payload.
- Keep TypeScript API types aligned with backend response shapes.
- Never silently replace a failed write with a success state.
- Use optimistic updates only with visible saving/error status and a recovery path.
- Preserve local fallback without hiding that data is local or unsynchronized.
- Do not expose credentials in source, logs, or UI.

## Decision Gates

| Situation | Action |
|---|---|
| Read fails | Keep safe local state and show offline status. |
| Write fails | Keep or mark the local change, show error, and provide retry/recovery. |
| Contract differs | Fix the contract mapping; do not coerce silently. |
| Long analysis request | Show progress, prevent duplicate submission, and expose failure. |

## Execution Steps

1. Trace the endpoint, schema, model, client, state hook, and screen.
2. Add typed request/response mapping at the service boundary.
3. Implement loading, success, error, offline, and retry states.
4. Verify geometry, dates, enums, IDs, and nullability explicitly.
5. Run `cd frontent && npm run lint && npm run build`; run backend tests when dependencies exist.

## Output Contract

Return endpoints connected, contract files changed, fallback behavior, and exact verification results.

## References

- `backend/app/main.py`
- `backend/app/schemas.py`
- `frontent/src/services/apiClient.ts`
- `frontent/src/hooks/useAgroTerraState.ts`
