# Repository Guidelines

## Project Structure & Module Organization

- `backend/` contains the FastAPI service, SQLAlchemy models, Pydantic schemas, NASA POWER integration, rotation scoring, and Python tests in `backend/tests/`.
- `frontend/` is a Next.js App Router application. Reusable UI lives in `frontend/components/`; API types and requests are in `frontend/lib/api.ts`; static assets belong in `frontend/public/`.
- `compose.yaml` runs PostGIS, the API, and the web app. Use `.env.example` as the configuration template; never commit `.env` or credentials.

## Build, Test, and Development Commands

```bash
docker compose up --build -d       # Build and run the full stack
docker compose ps                  # Check service status
cd backend && python -m pytest -q  # Run backend tests
cd frontend && npm run lint        # Type-check the frontend
cd frontend && npm run build       # Create a production Next.js build
```

For local development, run `uvicorn app.main:app --reload` from `backend/` in an activated virtual environment and `npm run dev` from `frontend/`.

## Coding Style & Naming Conventions

Use four-space indentation in Python and follow clear, typed TypeScript. Name Python modules and functions in `snake_case`, React components in `PascalCase`, and variables/functions in `camelCase`. Keep domain logic in backend services rather than route handlers, and reuse the existing API client and component patterns. Run the relevant type-check or test command before opening a PR.

## Testing Guidelines

Backend tests use `pytest`; name files `test_*.py` and test functions `test_*`. Add or update tests for API validation, rotation scoring, and integration behavior when changing those areas. The frontend currently uses `npm run lint` as its type-checking gate; preserve a clean result.

## Commit & Pull Request Guidelines

Use Conventional Commits, for example `feat: add crop comparison` or `fix: reject invalid coordinates`. PRs should explain the behavior change, list verification commands, link related issues when applicable, and include screenshots or request/response examples for UI or API changes. Call out configuration, migration, or deployment impacts explicitly.

## Security & Configuration Tips

Do not expose Postgres or the API publicly without authentication, rate limiting, backups, and HTTPS. NASA POWER failures must remain visible; do not substitute fabricated climate data.
