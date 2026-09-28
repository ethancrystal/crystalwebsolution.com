# API

## Style

- Next.js route handlers under `app/api/*/route.js`, plus `'use server'` actions for CRM mutations.
- There is no versioning or shared base path beyond `/api`.

## Resources

- `POST /api/contact`: rate limit, validate, optional hCaptcha, then create a CRM lead (best-effort) and email operations.
- `GET|POST /api/cron/crm-notifications`: authenticated with a cron secret. Claims outbox email rows under a lease, sends them, and retries with backoff.
- `GET /api/health`: dependency-free liveness for the Docker healthcheck.
- `/api/sentry-verification`: 404 outside a preview with an explicit trigger.
- Server actions: `app/actions/{project,brief,onboarding,blog}-actions.js`, `app/auth/actions.js`, `app/admin/users/actions.js`.

## Contracts

- Route handlers return JSON `{ ok, message, errors? }` with meaningful status codes (400, 401, 429, 502, 503).
- Server actions take `FormData` and return `{ ok: true, data, requestId }` or `{ ok: false, error, requestId }`. Database errors are logged as `{ requestId, code }` only.
- Project actions revalidate every affected path through `revalidateAllProjectPaths(projectId)`.
- The project read shape is the contract in `lib/crm/project-contract.mjs`.
