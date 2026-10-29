# Prinote server

Express 5, TypeScript ESM, PostgreSQL and Drizzle. Requires Node.js 24 and Bun for package management/tests.

## Local development

Run `bun install`, copy `.env.example` to `.env`, configure a development database, then run `bun run db:migrate` and `bun run dev`.

Verification: `bun run typecheck`, `bun run lint:check`, `bun test`, `bun run build`, then `bun run start`.
All internal source imports use relative `.js` specifiers; TypeScript resolves them to `.ts` and preserves valid ESM paths in emitted JavaScript.

## Vercel deployment

Connect the repository and set Root Directory to `server` (the directory containing this file), Framework Preset to Express, and Node.js to 24.x. Leave Build Command and Output Directory overrides disabled; Vercel handles the Express TypeScript entrypoint `src/app.ts`. Do not configure `dist` as a static output directory. For deployment with the Vercel CLI, run it from this directory.

Set Production environment variables: `NODE_ENV=production`, `DATABASE_URL` to a reachable PostgreSQL URL (including TLS settings required by the database provider), `LOG_LEVEL=info`, and `CORS_ORIGIN` to the exact frontend origin without a trailing slash. `PORT` defaults to 3000 and is not required. Use a same-site frontend/API domain arrangement for the current SameSite=Lax session cookies. Do not commit `.env`.

Review and apply migrations with `bun run db:migrate` against the intended database as a separate release step. Builds never migrate or seed the database. Commit and push changes, then deploy that commit. If redeploying manually, choose the latest commit and disable the build cache for the first retry.

Check `GET /api/v1/health` for liveness, `GET /api/v1/health/ready` for database readiness, and Runtime Logs after deployment. Test registration, login, and todo CRUD with a cookie-preserving client. Swagger UI is development-only at `/api/docs`.

## API behavior

Auth: `POST /api/auth/register`, `POST /api/auth/login`, `DELETE /api/auth/logout`, `GET /api/auth/me`.
Todos: `GET /api/todos/get?by=id&value=<uuid>` (or `by=slug`), `GET /api/todos/query`, `POST /api/todos`, `PATCH /api/todos/:todoId`, `DELETE /api/todos/:todoId`.
Every todo operation is scoped to the authenticated owner. Delete is a soft delete; deleted rows are excluded from reads, pagination, counts and later writes. There is no restore endpoint yet.

Create/update allow only `name`, `description`, `archived`, `status`, `priority`, and `dueDate`. Dates use ISO 8601 strings with a timezone. Internal IDs, ownership, timestamps and slugs cannot be supplied. Empty updates are rejected. Slugs are generated with a UUID suffix and change when a todo is renamed. New passwords require 8–1000 characters; login continues to accept existing nonempty shorter passwords. Pagination totals follow the active filters, and cursors must belong to those results.

## Development seed

The seed script resets the configured database and creates demo accounts using password `11111111`. It refuses to run in production or on Vercel. Use only a disposable local database and explicitly opt in with `ALLOW_DATABASE_RESET=true bun run db:seed`.
