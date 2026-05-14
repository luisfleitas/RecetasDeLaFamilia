# Clerk Auth Provider Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status:** Approved for implementation after user review on 2026-05-13.

**Goal:** Move hosted Recetas authentication to Clerk while preserving local password/JWT auth for development and keeping local `User.id` as the durable app identity.

**Architecture:** Add a provider-neutral auth boundary that returns `AppAuthUser` for both request handlers and server-rendered pages. Keep local JWT/password auth behind a local provider, add Clerk behind a provider-owned implementation, and link Clerk users to local `User` rows before any recipe, family, import, or profile workflow sees the session.

**Tech Stack:** Next.js App Router, React 19, Prisma 7, SQLite local development, Postgres hosted deployments, Clerk Next.js SDK, Node test runner, existing shell smoke tests.

**External Docs Checked:** Clerk Next.js `auth()` docs say the server helper is App Router only and requires `clerkMiddleware()`. Clerk environment docs name `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` for Next.js apps. Next.js 16 uses `proxy.ts` for the request interception file; Clerk still exports the `clerkMiddleware()` API used from that file.

---

## Planning Decisions

- Use `AUTH_PROVIDER=local|clerk`, defaulting to `local`.
- Choose the nullable password model: `passwordHash String?`. This matches externally authenticated Clerk users and avoids sentinel password hashes.
- Keep `username` required. If Clerk data cannot produce a valid available username, create a profile-incomplete local user with a reserved generated username and redirect the user to Recetas profile completion.
- Add `profileCompletedAt DateTime?` instead of a boolean. Current dev/staging users and seeded users get a timestamp in the migration; incomplete Clerk-created users keep it null.
- `AppAuthUser` includes `profileCompletedAt: Date | null` so protected guards can enforce completion without scattered route lookups.
- Convert request auth helpers to async in the same task that updates all call sites. Clerk identity linking requires database reads/writes, so API routes must `await getAuthUserFromRequest(request)` before the first build check.
- Do not use Clerk machine/API tokens for V1 hosted Recetas API access. Existing bearer-token support remains local-provider only.
- Use `proxy.ts`, not `middleware.ts`, for Clerk request interception on Next.js 16.
- Use a composite unique constraint for provider identities: `(authProvider, authProviderUserId)`.
- Normalize email addresses consistently before lookup, link, or create.
- Run Clerk identity linking, external-user creation, and profile updates in database transactions.
- This app is not live yet. Keep migration scripts straightforward for current dev/staging data instead of adding broad backward-compatibility complexity.
- Treat all local users explicitly as `authProvider = "local"` and `authProviderUserId = null`, including seeded users, current dev/staging users, and future local registrations.
- Clerk profile-completion email is locked to Clerk's primary email; Recetas profile completion edits first name, last name, and username only.
- Clerk-mode logout must delegate to Clerk's supported sign-out mechanism through a provider-owned wrapper. Do not manually clear Clerk cookies.

## File Map

Create:

- `lib/auth/types.ts`: shared provider-neutral auth types.
- `lib/auth/provider-config.ts`: parses and validates `AUTH_PROVIDER`.
- `lib/auth/local-provider.ts`: current JWT cookie and bearer-token behavior behind the provider interface.
- `lib/auth/clerk-provider.ts`: Clerk server session resolution and local identity linking.
- `lib/auth/clerk-user-linker.ts`: provider-id match, email match, create-user, and profile-completion decisions.
- `lib/auth/username-candidates.ts`: username normalization and collision fallback helpers.
- `lib/auth/profile-completion.ts`: shared profile-completion checks and redirect targets.
- `lib/auth/clerk-client-provider.tsx`: provider-owned Clerk client wrapper for the root layout.
- `proxy.ts`: Clerk `clerkMiddleware()` wiring with a local-mode no-op for Next.js 16.
- `app/sign-in/[[...sign-in]]/page.tsx`: provider-owned Clerk sign-in route.
- `app/sign-up/[[...sign-up]]/page.tsx`: provider-owned Clerk sign-up route.
- `app/user-profile/[[...user-profile]]/page.tsx`: provider-owned Clerk account/security route.
- `app/account/complete-profile/page.tsx`: Recetas-owned profile completion page.
- `app/account/complete-profile/complete-profile-form.tsx`: profile completion form.
- `app/api/auth/complete-profile/route.ts`: profile completion API endpoint.
- `scripts/auth-provider-config.test.ts`: provider selection tests.
- `scripts/local-auth-provider.test.ts`: local provider behavior tests.
- `scripts/clerk-user-linker.test.ts`: pure identity-linking tests.
- `scripts/auth-boundary-imports.test.ts`: Clerk import boundary test.

Modify:

- `package.json`, `package-lock.json`: add `@clerk/nextjs` and auth test scripts.
- `prisma/schema.prisma`: add provider identity fields, nullable password, composite provider identity uniqueness, and profile completion timestamp.
- `prisma/migrations/<timestamp>_add_auth_provider_identity/migration.sql`: add the local SQLite auth migration script.
- `prisma/migrations/<timestamp>_add_auth_provider_identity/postgres.sql`: add the hosted Postgres auth migration script.
- `lib/domain/user.ts`: nullable password and provider/profile fields.
- `lib/domain/user-repository.ts`: identity-linking methods.
- `lib/infrastructure/auth/prisma-user-repository.ts`: Prisma implementation for new user fields and linking methods.
- `lib/application/auth/use-cases.ts`: local password auth must reject users without a password hash.
- `lib/auth/factory.ts`: split auth use-case construction from auth provider construction.
- `lib/auth/request-auth.ts`, `lib/auth/page-auth-user.ts`, `lib/auth/require-auth-page.ts`: provider-neutral async auth helpers.
- All files currently calling `getAuthUserFromRequest`, `getOptionalAuthPageUser`, or `requireAuthPage`.
- `app/layout.tsx`: wrap children in the provider-owned Clerk client wrapper only when Clerk mode is enabled.
- `app/login/page.tsx`, `app/register/page.tsx`, `app/account/change-password/page.tsx`: stable Recetas routes that switch between local UI and Clerk-owned hosted/auth screens.
- `app/api/auth/login/route.ts`, `app/api/auth/register/route.ts`, `app/api/auth/logout/route.ts`, `app/api/auth/me/route.ts`, `app/api/auth/change-password/route.ts`: route-level behavior for local and Clerk modes.
- `prisma/seed.mjs`: keep seeded local users profile-complete and password-backed.
- `scripts/auth-smoke-test.sh`, `scripts/route-guards-smoke-test.sh`: keep local-mode assumptions explicit.
- `requirements/clerk-auth-migration/handoff.md`, `requirements/clerk-auth-migration/qa-checklist.md`: update after each task.

## Task 1: Provider Config, Local Provider Boundary, And Async Call Sites

**Files:**

- Create: `lib/auth/types.ts`
- Create: `lib/auth/provider-config.ts`
- Create: `lib/auth/local-provider.ts`
- Create: `scripts/auth-provider-config.test.ts`
- Create: `scripts/local-auth-provider.test.ts`
- Modify: `lib/auth/request-auth.ts`
- Modify: `lib/auth/page-auth-user.ts`
- Modify: `lib/auth/require-auth-page.ts`
- Modify: `lib/auth/factory.ts`
- Modify all files returned by `rg -l "getAuthUserFromRequest|requireAuthPage|getOptionalAuthPageUser" app lib scripts`.
- Modify files with old auth-object shape usage, especially exact `authUser.user_id` references.
- Modify: `package.json`

- [x] Add `AppAuthUser`, `AuthProviderName`, and provider method types in `lib/auth/types.ts`.
- [x] `AppAuthUser` must include `userId: number`, `username: string`, and `profileCompletedAt: Date | null`.
- [x] Add `resolveAuthProviderName()` in `lib/auth/provider-config.ts`; it returns `local` when `AUTH_PROVIDER` is unset and throws `Unsupported AUTH_PROVIDER: <value>` otherwise.
- [x] Move the current cookie and bearer parsing from `lib/auth/request-auth.ts` into `lib/auth/local-provider.ts`.
- [x] Keep local provider behavior unchanged: cookies and bearer tokens are accepted for request handlers, only cookies are accepted for page auth.
- [x] Update `getAuthUserFromRequest`, `getOptionalAuthPageUser`, and `requireAuthPage` to return `Promise<AppAuthUser | null>` or `Promise<AppAuthUser>`.
- [x] Update every `getAuthUserFromRequest(request)` call to `await getAuthUserFromRequest(request)` before running the first build.
- [x] Update only old auth helper object-shape usage from `authUser.user_id` to `authUser.userId`.
- [x] Preserve compatibility contracts that intentionally use `user_id`:
  - JWT payload field `user_id`
  - `/api/auth/me` response shape `{ user: { user_id, username } }`
  - shell smoke scripts parsing `user.user_id`
  - Prisma/database `user_id` mappings
- [x] Keep page redirects unchanged in local mode.
- [x] Add provider config tests:

```ts
import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveAuthProviderName } from "../lib/auth/provider-config";

test("auth provider defaults to local", () => {
  assert.equal(resolveAuthProviderName({}), "local");
});

test("auth provider accepts local and clerk", () => {
  assert.equal(resolveAuthProviderName({ AUTH_PROVIDER: "local" }), "local");
  assert.equal(resolveAuthProviderName({ AUTH_PROVIDER: "clerk" }), "clerk");
});

test("auth provider rejects unsupported values clearly", () => {
  assert.throws(
    () => resolveAuthProviderName({ AUTH_PROVIDER: "oauth" }),
    /Unsupported AUTH_PROVIDER: oauth/,
  );
});
```

- [x] Add local provider tests that sign a token with `signAccessToken`, resolve it from a cookie, resolve it from an `Authorization: Bearer` header, and reject malformed tokens.
- [x] Add an `npm` script such as `test:auth` for the new Node tests.
- [x] Run: `npm run test:auth`
- [x] Run: `npm run build`
- [x] Run local smoke tests with `AUTH_PROVIDER=local`: `scripts/route-guards-smoke-test.sh` and `scripts/auth-smoke-test.sh`.

## Task 2: User Model, Migration Scripts, And Repository Linking Fields

**Files:**

- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/<timestamp>_add_auth_provider_identity/migration.sql`
- Modify: `lib/domain/user.ts`
- Modify: `lib/domain/user-repository.ts`
- Modify: `lib/infrastructure/auth/prisma-user-repository.ts`
- Modify: `lib/application/auth/use-cases.ts`
- Modify: `prisma/seed.mjs`
- Modify: `scripts/postgres-schema-check.mjs`

- [x] Change `passwordHash` to nullable in Prisma and domain types.
- [x] Add `authProvider String @map("auth_provider")` with local users explicitly classified as `local`.
- [x] Add `authProviderUserId String? @map("auth_provider_user_id")`.
- [x] Add composite uniqueness for provider identities with `@@unique([authProvider, authProviderUserId])`.
- [x] Add `profileCompletedAt DateTime? @map("profile_completed_at")`.
- [x] Migration SQL must set current dev/staging users to `auth_provider = 'local'`, `auth_provider_user_id = NULL`, and `profile_completed_at` to a timestamp.
- [x] Include every required database migration script in `prisma/migrations/<timestamp>_add_auth_provider_identity/`; do not rely on chat-only SQL.
- [x] Update `scripts/postgres-schema-check.mjs` to assert the new auth columns and composite provider identity uniqueness.
- [x] Add repository methods:
  - `getByAuthProviderIdentity(provider, providerUserId)`
  - `attachAuthProviderIdentity(userId, provider, providerUserId)`
  - `createExternalAuthUser(input)`
  - `completeProfile(userId, input)`
- [x] Update local `login` and `changePassword` use cases to reject null `passwordHash` with the existing invalid-credentials path.
- [x] Update local registration to create users with `authProvider = "local"` and `authProviderUserId = null`.
- [x] Update seed data so `alice` and `bob` stay local, password-backed, and profile-complete.
- [x] Run: `npx prisma generate`
- [x] Run: `npm run test:auth`
- [x] Run: `npm run db:postgres:check`
- [x] Run: `npm run build`

## Task 3: Clerk Provider, Proxy, And Stable Auth Routes

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `proxy.ts`
- Create: `lib/auth/clerk-provider.ts`
- Create: `lib/auth/clerk-user-linker.ts`
- Create: `lib/auth/stable-auth-routes.ts`
- Create: `lib/auth/username-candidates.ts`
- Create: `lib/auth/clerk-client-provider.tsx`
- Create: `app/sign-in/[[...sign-in]]/page.tsx`
- Create: `app/sign-up/[[...sign-up]]/page.tsx`
- Create: `app/user-profile/[[...user-profile]]/page.tsx`
- Modify: `app/layout.tsx`
- Modify: `app/login/page.tsx`
- Create: `app/login/login-form.tsx`
- Modify: `app/register/page.tsx`
- Create: `app/register/register-form.tsx`
- Modify: `app/account/change-password/page.tsx`
- Modify: `app/api/auth/logout/route.ts`
- Create: `scripts/clerk-user-linker.test.ts`
- Create: `scripts/auth-boundary-imports.test.ts`

- [x] Install `@clerk/nextjs`.
- [x] Add `proxy.ts` with Clerk's `clerkMiddleware()` available for Clerk mode. In local mode, do not protect app routes in proxy; keep existing server-side route/page guards authoritative.
- [x] Add a Clerk provider that calls Clerk server helpers, resolves the Clerk user id, fetches user profile data only when needed for linking, and returns `AppAuthUser`.
- [x] Normalize Clerk primary email addresses before lookup, link, or create.
- [x] Run provider-id attach, email match linking, and external-user creation in database transactions so failed linking cannot leave partial user state.
- [x] Keep all direct Clerk imports inside:
  - `proxy.ts`
  - `lib/auth/clerk-provider.ts`
  - `lib/auth/clerk-client-provider.tsx`
  - `app/sign-in/[[...sign-in]]/page.tsx`
  - `app/sign-up/[[...sign-up]]/page.tsx`
  - `app/user-profile/[[...user-profile]]/page.tsx`
- [x] Add identity-linking tests for provider-id match, email match, new complete user, and new incomplete user.
- [x] Add an import-boundary test that fails if `@clerk/nextjs` appears outside the provider-owned allowlist.
- [x] In Clerk mode, `/login` sends users to the Clerk sign-in experience and preserves a safe relative `next`.
- [x] In Clerk mode, `/register` sends users to the Clerk sign-up experience and preserves a safe relative `next`.
- [x] In Clerk mode, `/account/change-password` sends users to the Clerk account/security experience.
- [x] In Clerk mode, logout delegates to Clerk's supported sign-out mechanism through a provider-owned wrapper; do not manually clear Clerk cookies.
- [x] In local mode, all three stable routes keep their current behavior.
- [x] Run: `npm run test:auth`
- [x] Run: `npm run build`

## Task 4: Recetas Profile Completion Guard

**Files:**

- Create: `lib/auth/profile-completion.ts`
- Create: `app/account/complete-profile/page.tsx`
- Create: `app/account/complete-profile/complete-profile-form.tsx`
- Create: `app/api/auth/complete-profile/route.ts`
- Modify: `lib/auth/require-auth-page.ts`
- Modify: `lib/auth/request-auth.ts`
- Modify protected page/API route call sites only as needed to adopt centralized completed-profile helpers.
- Modify: `lib/i18n/messages.ts`
- Add tests to: `scripts/clerk-user-linker.test.ts`

- [x] Add `isProfileComplete(authUser)` and `getProfileCompletionRedirect(nextPath)` helpers based on `authUser.profileCompletedAt`.
- [x] Add centralized completed-profile helpers, such as `requireCompletedAuthPage()` and `getCompletedAuthUserFromRequest()`, instead of scattering custom incomplete-profile checks through each route.
- [x] For protected pages, require both authentication and profile completion through the centralized helper, except `/account/complete-profile`.
- [x] For protected API routes, return a stable response from the centralized helper for incomplete profiles: status `409` with code `PROFILE_INCOMPLETE`.
- [x] Create the profile completion page with first name, last name, locked Clerk primary email display, and username fields.
- [x] The API endpoint must validate username uniqueness, keep email locked to Clerk primary email for Clerk-created users, and then set `profileCompletedAt`.
- [x] Add tests for username collision and successful completion.
- [x] Run: `npm run test:auth`
- [x] Run: `npm run build`

## Task 5: Connect Clerk In Vercel Staging And Production

**Files:**

- Modify: `requirements/clerk-auth-migration/qa-checklist.md`
- Modify: `requirements/clerk-auth-migration/handoff.md`
- Modify: `README.md` or an existing operations doc if env setup guidance belongs there.

- [ ] Confirm the Clerk application/environment split before writing Vercel vars:
  - Vercel Preview/staging uses Clerk test keys.
  - Vercel Production uses Clerk live keys only when production Clerk auth is intentionally enabled.
- [ ] Add the required Vercel env vars for the staging/preview target:
  - `AUTH_PROVIDER=clerk`
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<Clerk test publishable key>`
  - `CLERK_SECRET_KEY=<Clerk test secret key>`
  - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
  - `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
  - `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/`
  - `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/`
- [ ] Add the required Vercel env vars for Production when ready:
  - `AUTH_PROVIDER=clerk`
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=<Clerk live publishable key>`
  - `CLERK_SECRET_KEY=<Clerk live secret key>`
  - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
  - `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
  - `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/`
  - `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/`
- [ ] Do not add optional Clerk env vars unless a later implementation step needs them:
  - `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL`
  - `NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL`
  - `CLERK_WEBHOOK_SIGNING_SECRET`
  - `CLERK_ENCRYPTION_KEY`
  - `NEXT_PUBLIC_CLERK_DOMAIN`
  - `NEXT_PUBLIC_CLERK_IS_SATELLITE`
- [ ] Redeploy the affected Vercel environment after setting env vars so the deployment sees Clerk mode.
- [ ] Verify Vercel exposes no secret values in docs, logs, handoff, or checklist updates.
- [ ] Update handoff with:
  - exact Vercel environment scopes configured
  - whether Preview/staging and Production use test or live Clerk keys
  - deployment URL(s) used for hosted validation
  - any account-owned setup still pending

## Task 6: Local Mode Regression And Hosted Clerk Validation

**Files:**

- Modify: `scripts/auth-smoke-test.sh`
- Modify: `scripts/route-guards-smoke-test.sh`
- Modify: `requirements/clerk-auth-migration/qa-checklist.md`
- Modify: `requirements/clerk-auth-migration/handoff.md`
- Modify: `README.md` or an existing operations doc if env setup guidance belongs there.

- [ ] Make local smoke scripts set or document `AUTH_PROVIDER=local`.
- [ ] Add env guidance without secret values:
  - `AUTH_PROVIDER=clerk`
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
  - optional Clerk route URL env vars if used by the route wrappers
- [ ] Run full local verification:
  - `npm run test:auth`
  - `npm run test:phase1`
  - `npm run test:phase2`
  - `npm run test:phase3`
  - `npm run test:phase4`
  - `npm run test:import`
  - `npm run build`
- [ ] Browser-check local mode:
  - unauthenticated home
  - register
  - login
  - logout
  - change password
  - protected recipe creation
  - family dashboard route guard
- [ ] Hosted Clerk validation, once Task 5 Vercel env vars are provisioned and the target environment is redeployed:
  - `/login` opens Clerk sign-in
  - `/register` opens Clerk sign-up
  - first Clerk login links by provider id on second request
  - existing local user links by email
  - username collision redirects to `/account/complete-profile`
  - complete profile unlocks protected workflows
  - `/account/change-password` opens Clerk account/security
  - logout ends the Clerk session through Clerk's supported sign-out mechanism
- [ ] Update handoff with exact verification commands, manual test status, known issues, and next action.

## Plan Approval Gate

Implementation is approved to start. The first implementation branch task is Task 1 only; do not install Clerk or modify Clerk-owned routes until the local provider boundary and async call-site migration are verified in a buildable state.
