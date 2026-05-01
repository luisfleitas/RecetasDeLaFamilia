# Neon Postgres Phase 2 Strategy

## Decision

Keep SQLite for local development and the existing fast CI suite during the first Neon migration pass. Add a separate Postgres compatibility gate that proves the current Prisma schema can be transformed into a clean Postgres baseline for Neon.

## Why

- Local setup stays low-friction for day-to-day Recetas work.
- The existing SQLite-backed tests and smoke scripts remain useful while production infrastructure is added incrementally.
- Production still moves to a clean Neon Postgres database before launch, matching the approved deployment plan.
- Staging and preview seed/sample data can be validated independently before Vercel deployment is treated as production-like.

## Phase 2 Implementation Slice

- Source of truth remains `prisma/schema.prisma` for now.
- `npm run db:postgres:check` generates `.tmp/postgres/schema.prisma` by replacing the SQLite provider with `postgresql`.
- The check runs `prisma validate` against the generated Postgres schema.
- The check runs `prisma migrate diff --from-empty --to-schema .tmp/postgres/schema.prisma --script` and writes a generated baseline SQL file to `.tmp/postgres/baseline.sql`.
- The check verifies key expected SQL fragments are present in the generated baseline.
- CI runs this check in `CI / quality-gate`.

## Neon Environment Strategy

Use separate Neon projects or clearly separated Neon databases for production and staging. Production starts empty and receives the clean Postgres baseline migration. Staging receives the same schema plus seed/sample data.

Preview deployments should use isolated preview database resources before a preview is treated as production-like. The preferred v1 strategy is one preview Neon branch or database per PR, with explicit cleanup after the PR closes. If automated preview database provisioning is not ready during the first Vercel setup, previews should keep database-backed production-like testing disabled until a temporary preview database is manually assigned.

## Seed And Data Rules

- Production: apply schema only; do not run sample seed data.
- Staging: apply schema, then run the seed/sample process.
- Preview: apply schema, then run seed/sample data only for isolated preview database resources.
- Local: keep SQLite and the current seed behavior unless a developer opts into a Postgres database explicitly.

## Remaining Phase 2 Work

- Decide whether to keep a generated Postgres schema check only or promote a dedicated tracked Postgres schema before production setup.
- Validate the baseline SQL against an actual Neon staging database once credentials/resources exist.
- Update seed/runtime commands for Postgres staging and production once the app runtime switches from SQLite to Neon.
