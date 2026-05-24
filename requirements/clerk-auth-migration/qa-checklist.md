# Clerk Auth Provider Migration QA Checklist

## Status

- Approved checklist for implementation.
- Task 1, Task 2, Task 3, and Task 4 local verification has run.
- Task 5 Vercel environment inspection has started; Clerk key variable names exist in Preview and Production, `AUTH_PROVIDER` now exists in Preview, and sensitive values are not visible through the CLI for test-vs-live verification.
- The latest staging redeploy is healthy but is not serving the Clerk migration routes yet.
- A feature-branch Vercel Preview now serves the Clerk migration routes at `https://recetas-6ren6162z-luisfleitas-1188s-projects.vercel.app`.
- A post-signup Preview crash with digest `543091922` was fixed by applying the hosted Postgres auth-provider migration.

## Automated Local Verification

- [x] `npm run test:auth`
- [ ] `npm run test:phase1`
- [ ] `npm run test:phase2`
- [ ] `npm run test:phase3`
- [ ] `npm run test:phase4`
- [ ] `npm run test:import`
- [x] `npm run db:postgres:check`
- [x] `npm run build`
- [x] First implementation slice remains buildable after converting auth helpers to async and updating every call site.
- [x] `scripts/postgres-schema-check.mjs` asserts auth provider columns, profile completion column, and provider identity uniqueness.
- [x] A Postgres companion migration exists for hosted database auth-provider columns.

## Local Provider Manual QA

Run with `AUTH_PROVIDER=local`.

- [x] Unauthenticated home shows Register and Login links.
- [x] `/register` creates a local password-backed user and starts a session.
- [x] `/login` signs in an existing seeded user.
- [x] `/api/auth/me` returns the current local user with the existing response shape.
- [x] JWT payload `user_id`, `/api/auth/me` response `user.user_id`, smoke-script parsing, and Prisma/database `user_id` mappings remain compatible.
- [ ] Logout clears the Recetas session cookie.
- [ ] `/account/change-password` changes a local password.
- [x] Protected pages redirect unauthenticated users to `/login`.
- [x] Existing bearer-token smoke scripts still work in local mode.
- [ ] Recipe creation, recipe edit, recipe image upload, import parsing, and family dashboard flows still use local `User.id`.
- [x] Local users are created with `authProvider = "local"` and `authProviderUserId = null`.

## Clerk Provider Hosted QA

Run only after real Clerk environment variables are configured in the target environment.

- [ ] `AUTH_PROVIDER=clerk` without required Clerk keys fails clearly during provider construction.
- [x] `proxy.ts` wires Clerk `clerkMiddleware()` for Next.js 16; no `middleware.ts` is introduced for Clerk.
- [x] `/login` opens the Clerk sign-in experience and preserves a safe relative `next`.
- [x] `/register` opens the Clerk sign-up experience and preserves a safe relative `next`.
- [ ] First Clerk login creates or links a local `User`.
- [x] Returning Clerk login resolves by `(authProvider, authProviderUserId)`.
- [x] Existing local user with matching normalized email links to the Clerk identity.
- [x] Clerk identity linking and external-user creation are transactional.
- [ ] Username collision creates a profile-incomplete user and redirects to `/account/complete-profile`.
- [ ] Profile completion keeps email locked to Clerk primary email, updates Recetas-owned editable profile fields, and unlocks protected workflows.
- [ ] Protected API routes return `409 PROFILE_INCOMPLETE` for incomplete profiles.
- [x] `/account/change-password` opens the Clerk account/security experience.
- [x] Logout ends the Clerk session through Clerk's supported sign-out mechanism, not manual Clerk cookie clearing.
- [x] No hosted Clerk flow mints or requires a Recetas JWT bearer token.

## Vercel Clerk Environment QA

- [ ] Preview/staging Vercel env vars are configured with Clerk test keys, not live keys.
- [ ] Production Vercel env vars are configured with Clerk live keys only when production Clerk auth is intentionally enabled.
- [ ] Clerk-enabled hosted environments include:
  - `AUTH_PROVIDER=clerk`
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
  - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
  - `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
  - `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/`
  - `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/`
- [ ] Optional Clerk env vars are absent unless explicitly needed by implementation:
  - `NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL`
  - `NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL`
  - `CLERK_WEBHOOK_SIGNING_SECRET`
  - `CLERK_ENCRYPTION_KEY`
  - `NEXT_PUBLIC_CLERK_DOMAIN`
  - `NEXT_PUBLIC_CLERK_IS_SATELLITE`
- [ ] A fresh deployment was triggered after env var changes.
- [x] Feature-branch Preview deployment was triggered after the branch code was ready for hosted route validation.
- [x] Handoff records configured Vercel scopes and validation deployment URLs without secret values.

## Import Boundary QA

- [x] `@clerk/nextjs` imports are limited to the allowlisted provider-owned files.
- [x] The allowlist uses `proxy.ts`, not `middleware.ts`.
- [x] Recipe, family, import, and shared UI files do not import Clerk directly.
- [x] App routes and services consume `AppAuthUser`, not Clerk user ids.
- [x] `AppAuthUser` includes `profileCompletedAt: Date | null`.
- [x] Protected pages/API routes use centralized completed-profile helpers instead of ad hoc profile-completion checks.

## Documentation QA

- [x] `requirements/clerk-auth-migration/handoff.md` is updated after each completed task.
- [x] This checklist records exact commands and manual browser results after implementation.
- [x] Env guidance documents variable names only, not secret values.
- [x] Database migration scripts are present under `prisma/migrations/.../migration.sql` and `prisma/migrations/.../postgres.sql`.

## Verification Notes

### Task 1: Provider Config And Local Provider Boundary

- `npm run test:auth` passed.
- `npm run build` passed.
- Temporary dev server used: `PORT=3100 npm run dev`.
- `AUTH_PROVIDER=local BASE_URL=http://localhost:3100 scripts/route-guards-smoke-test.sh` passed.
- `AUTH_PROVIDER=local BASE_URL=http://localhost:3100 scripts/auth-smoke-test.sh` passed.
- Hosted Clerk QA not run; Clerk env vars are not configured yet.

### Task 2: User Model And Repository Linking Fields

- Watched `npm run test:auth` fail first for missing local user classification, null password-hash guards, and repository linking methods.
- `npm run test:auth` passed.
- `npx prisma generate` passed.
- `npm run db:postgres:check` passed.
- `npm run build` passed.
- Hosted Clerk QA not run; Clerk SDK and env vars are still pending Task 3 and Task 5.

### Task 3: Clerk Provider, Proxy, And Stable Auth Routes

- Watched `npm run test:auth` fail first for missing `lib/auth/clerk-user-linker`.
- Watched `npm run test:auth` fail first for missing `lib/auth/stable-auth-routes`.
- `npm install @clerk/nextjs` installed `@clerk/nextjs@7.3.3` and updated `package-lock.json`.
- `npm run test:auth` passed.
- `npm run build` passed.
- Hosted Clerk browser QA not run; real Clerk env vars are still pending Task 5.

### Task 4: Recetas Profile Completion Guard

- Watched `npm run test:auth` fail first because `lib/auth/profile-completion` was missing.
- Added focused tests for profile-completion redirects, username collision, and successful completion.
- `npm run test:auth` passed.
- `npm run build` passed.
- Hosted Clerk browser QA not run; real Clerk env vars are still pending Task 5.

### Task 5: Vercel Clerk Environment Inspection

- `npx vercel env ls` passed on 2026-05-13.
- Initial Vercel Preview inspection listed `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, but did not list `AUTH_PROVIDER` or the Clerk route URL variables.
- Vercel Production currently lists `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, but does not list `AUTH_PROVIDER` or the Clerk route URL variables.
- `npx vercel env pull` to temporary files did not expose sensitive Clerk key values for test/live prefix validation, and the temporary files were deleted.
- After the user updated and redeployed staging, `npx vercel env ls` showed `AUTH_PROVIDER` present in Preview.
- `npx vercel inspect https://recetas-bim34ew4r-luisfleitas-1188s-projects.vercel.app` showed Ready deployment `dpl_DYmiT1ZWqtksQKT7Q83nZR5QCAQW`, aliased to `https://staging.recetasfamilia.app`.
- `npx vercel curl /api/health --deployment https://recetas-bim34ew4r-luisfleitas-1188s-projects.vercel.app` returned healthy app, database, and Blob checks.
- `npx vercel curl /login --deployment https://recetas-bim34ew4r-luisfleitas-1188s-projects.vercel.app` rendered the local Recetas login form, not Clerk.
- `npx vercel curl /register --deployment https://recetas-bim34ew4r-luisfleitas-1188s-projects.vercel.app` rendered the local Recetas registration form, not Clerk.
- `npx vercel curl /sign-in --deployment https://recetas-bim34ew4r-luisfleitas-1188s-projects.vercel.app` returned a Next 404 page.
- `npx vercel curl /sign-up --deployment https://recetas-bim34ew4r-luisfleitas-1188s-projects.vercel.app` returned a Next 404 page.
- Hosted Clerk validation against the staging alias is blocked because the redeployed staging artifact does not include this branch's Clerk migration route changes.
- `npm run test:auth` passed on 2026-05-13 before deploying the feature Preview.
- `npm run build` passed on 2026-05-13 before deploying the feature Preview.
- `npx vercel deploy -y` created Ready feature Preview deployment `dpl_FyAsm3HBSJZXCPorgxZrX6SksA46` at `https://recetas-6ren6162z-luisfleitas-1188s-projects.vercel.app`.
- Vercel remote build for `dpl_FyAsm3HBSJZXCPorgxZrX6SksA46` completed successfully and included Clerk routes `/sign-in/[[...sign-in]]`, `/sign-up/[[...sign-up]]`, `/user-profile/[[...user-profile]]`, and `Proxy (Middleware)`.
- `npx vercel curl /api/health --deployment https://recetas-6ren6162z-luisfleitas-1188s-projects.vercel.app` returned healthy app and database checks.
- `npx vercel curl /sign-in --deployment https://recetas-6ren6162z-luisfleitas-1188s-projects.vercel.app` rendered the Clerk sign-in route shell.
- `npx vercel curl /sign-up --deployment https://recetas-6ren6162z-luisfleitas-1188s-projects.vercel.app` rendered the Clerk sign-up route shell.
- `npx vercel curl /login --deployment https://recetas-6ren6162z-luisfleitas-1188s-projects.vercel.app` returned a redirect to `/sign-in`.
- `npx vercel curl /register --deployment https://recetas-6ren6162z-luisfleitas-1188s-projects.vercel.app` returned a redirect to `/sign-up`.
- Full interactive Clerk browser validation is still pending against the feature Preview, including first-login linking, profile completion, protected API `409 PROFILE_INCOMPLETE`, and Clerk logout.

### Hosted Postgres Auth Migration Fix

- The user reported a server-side application error after Clerk account creation on `https://recetas-6ren6162z-luisfleitas-1188s-projects.vercel.app`.
- `npx vercel logs https://recetas-6ren6162z-luisfleitas-1188s-projects.vercel.app --since 2h --level error --expand` found digest `543091922`: Prisma `P2022`, `The column users.auth_provider does not exist in the current database`.
- Added `prisma/migrations/20260513120000_add_auth_provider_identity/postgres.sql` so the hosted Postgres migration is documented alongside the SQLite migration.
- A temporary token-gated Preview endpoint applied the Postgres auth-provider migration from inside Vercel runtime where the real database URL is available.
- The migration response confirmed columns `auth_provider`, `auth_provider_user_id`, and `profile_completed_at`.
- The temporary migration deployment `https://recetas-g3xyybww6-luisfleitas-1188s-projects.vercel.app` was removed after the migration succeeded.
- `npx vercel curl /api/health --deployment https://recetas-6ren6162z-luisfleitas-1188s-projects.vercel.app` returned healthy checks after the migration.
- `npx vercel curl / --deployment https://recetas-6ren6162z-luisfleitas-1188s-projects.vercel.app` rendered the home page after the migration.
- `npx vercel logs https://recetas-6ren6162z-luisfleitas-1188s-projects.vercel.app --since 5m --level error --expand` showed no new Prisma `P2022` crashes; only the existing pg SSL-mode warning appeared.

### Staging Logout Click Bugfix

- User reported that clicking logout in staging appeared to do nothing.
- Root cause traced to the shared client `LogoutButton`: it posted to `/api/auth/logout` but did not validate the response or navigate to a visible signed-out destination.
- Added `scripts/logout-button-client.test.ts` and included it in `npm run test:auth`.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/logout-button-client.test.ts` passed.
- `npm run test:auth` passed.
- `npm run build` passed.
- `npx vercel deploy -y` created Ready deployment `dpl_31oKCSHw2XTVyTty6bwqK2wjab5z` at `https://recetas-ady5h3dbb-luisfleitas-1188s-projects.vercel.app`.
- `npx vercel alias set recetas-ady5h3dbb-luisfleitas-1188s-projects.vercel.app staging.recetasfamilia.app` succeeded.

### Staging Logout Hard-Navigation Follow-Up

- User clarified that logout does end the session, but the visible signed-out state only appears after pressing F5.
- Root cause traced to the shared client `LogoutButton` using App Router soft navigation after the successful `/api/auth/logout` POST; the client shell can continue showing stale signed-in state until a document reload.
- Updated `scripts/logout-button-client.test.ts` so the regression requires a document navigation via `window.location.assign("/")` to the public landing page and rejects both `/login` hard navigation and `router.replace("/login")`.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/logout-button-client.test.ts` failed before the fix for the expected missing `window.location.assign("/login")`.
- Updated `app/_components/logout-button.tsx` to keep response validation and use `window.location.assign("/")` after a successful logout.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/logout-button-client.test.ts` passed.
- `npm run test:auth` passed.
- `npm run build` passed.
- `git diff --check` passed.
- Branch `codex/fix/logout-hard-navigation` was pushed and PR #37 was opened back to `pre-main`.
- `npx vercel deploy -y` created Ready deployment `dpl_A7Fid81j4SsSddvcfq53qHrTg6Ge` at `https://recetas-j833blvxs-luisfleitas-1188s-projects.vercel.app`.
- `npx vercel alias set recetas-j833blvxs-luisfleitas-1188s-projects.vercel.app staging.recetasfamilia.app` succeeded.
- `npx vercel inspect https://staging.recetasfamilia.app` resolved to Ready deployment `dpl_A7Fid81j4SsSddvcfq53qHrTg6Ge`.
- `npx vercel curl /api/health --deployment https://staging.recetasfamilia.app` returned healthy app and database checks.
- User confirmed the hard-navigation version ended the session without F5, then requested landing on the public home page instead of `/login`.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/logout-button-client.test.ts` failed before the destination update because `LogoutButton` still used `window.location.assign("/login")`.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/logout-button-client.test.ts` passed after switching the destination to `window.location.assign("/")`.
- `npm run test:auth` passed after the landing-page destination update.
- `npm run build` passed after the landing-page destination update.
- `git diff --check` passed after the landing-page destination update.
- `npx vercel deploy -y` created Ready deployment `dpl_EncDNbUeuwqkNUKQSeCX18faENeC` at `https://recetas-ktx36bxhs-luisfleitas-1188s-projects.vercel.app`.
- `npx vercel alias set recetas-ktx36bxhs-luisfleitas-1188s-projects.vercel.app staging.recetasfamilia.app` succeeded.
- `npx vercel inspect https://staging.recetasfamilia.app` resolved to Ready deployment `dpl_EncDNbUeuwqkNUKQSeCX18faENeC`.
- `npx vercel curl /api/health --deployment https://staging.recetasfamilia.app` returned healthy app and database checks.
- Interactive browser verification that the logout click lands on the public home page as an unauthenticated user is still pending.
