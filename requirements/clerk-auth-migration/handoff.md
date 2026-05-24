# Clerk Auth Provider Migration Handoff

## Current State

- Branch: `codex/feature/clerk-auth-provider-migration`
- Design: `requirements/clerk-auth-migration/design.md`
- Implementation plan: `requirements/clerk-auth-migration/implementation-plan.md`
- QA checklist: `requirements/clerk-auth-migration/qa-checklist.md`
- Status: Tasks 1, 2, 3, and 4 complete; Task 5 is in progress. A staging logout click bugfix is deployed from `codex/feature/fix-staging-logout` to `https://staging.recetasfamilia.app`.

## Completed

- Approved design captured in `design.md`.
- Live repo inspection completed for current auth helpers, auth API routes, login/register/change-password pages, Prisma `User`, seed data, and smoke tests.
- Implementation plan approved with nullable `passwordHash`, provider-neutral auth helpers, Clerk identity linking, Next.js 16 `proxy.ts`, and profile completion as the selected path.
- Review decisions from 2026-05-13 were written into `implementation-plan.md` and `qa-checklist.md`.
- Task 1 implemented provider config, local request auth provider, async auth helpers, auth call-site migration, and focused auth tests.
- Task 2 implemented nullable `passwordHash`, auth provider identity fields, profile completion timestamp, repository linking methods, local password null-hash guards, seed updates, migration SQL, Postgres schema assertions, and focused auth tests.
- Task 3 installed `@clerk/nextjs`, added the Clerk provider/linker, transactional identity linking, Next.js 16 `proxy.ts`, Clerk-owned sign-in/sign-up/user-profile routes, route switching for `/login`, `/register`, and `/account/change-password`, provider-owned Clerk logout, import-boundary coverage, and focused auth tests.
- Task 4 added centralized profile-completion helpers, `/account/complete-profile`, `/api/auth/complete-profile`, incomplete-profile guards for protected page/API flows, locked-email profile completion, and focused auth tests.
- Staging logout click bugfix updates the shared `LogoutButton` to validate `/api/auth/logout`, visibly redirect to `/login`, refresh app state, and show a localized error if logout fails.

## In Progress

- Task 5 Vercel environment inspection is complete.
- Vercel currently has `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` variable names in both Preview and Production, but the CLI does not expose sensitive values, so the test-vs-live key split is not independently verified.
- `AUTH_PROVIDER` is now configured in Preview.
- The Clerk route URL variables are not configured in Vercel yet.
- Latest staging deployment inspected: `dpl_DYmiT1ZWqtksQKT7Q83nZR5QCAQW` / `https://recetas-bim34ew4r-luisfleitas-1188s-projects.vercel.app`, aliased to `https://staging.recetasfamilia.app`.
- Feature-branch Preview deployed from the current working tree: `dpl_FyAsm3HBSJZXCPorgxZrX6SksA46` / `https://recetas-6ren6162z-luisfleitas-1188s-projects.vercel.app`.
- Logout bugfix Preview deployed from `codex/feature/fix-staging-logout`: `dpl_31oKCSHw2XTVyTty6bwqK2wjab5z` / `https://recetas-ady5h3dbb-luisfleitas-1188s-projects.vercel.app`, aliased to `https://staging.recetasfamilia.app`.
- The feature Preview returns healthy `/api/health`, renders Clerk-backed `/sign-in` and `/sign-up` pages, and redirects `/login` to `/sign-in` plus `/register` to `/sign-up`.
- A post-signup crash on the feature Preview was traced to hosted Postgres schema drift: Prisma error `P2022`, digest `543091922`, because `users.auth_provider` did not exist.
- The Preview database auth migration was applied on 2026-05-13 via a temporary token-gated Preview endpoint that was removed afterward; the temporary deployment was also removed.

## Next Action

- Run hosted browser/manual Clerk QA against the feature Preview: `https://recetas-6ren6162z-luisfleitas-1188s-projects.vercel.app`.
- Add the missing Clerk route URL vars for the intended staging scope if the hosted Clerk routes require them after the branch code is deployed.
- Confirm with the user that the existing Vercel Preview Clerk keys are test keys and the existing Vercel Production Clerk keys are live keys before enabling Clerk in Production.
- Continue hosted Clerk browser QA on the feature Preview, especially first-login linking, profile completion, protected API `409 PROFILE_INCOMPLETE`, and Clerk logout.

## Known Issues

- Clerk key variable names exist in Vercel Preview and Production, but their sensitive values and test/live prefixes are not visible through the CLI.
- `AUTH_PROVIDER` now exists in Vercel Preview. The staging alias now points at the logout bugfix deployment from `codex/feature/fix-staging-logout`.
- Clerk route URL variables are still missing in Vercel.
- Existing SQLite databases need `prisma/migrations/20260513120000_add_auth_provider_identity/migration.sql`; hosted Postgres databases need `prisma/migrations/20260513120000_add_auth_provider_identity/postgres.sql`.
- Full Clerk hosted browser validation still needs the Clerk key split confirmed and missing Vercel vars added if needed.
- Clerk logout must use Clerk's supported sign-out mechanism through the provider boundary; do not manually clear Clerk cookies.
- The shared logout UI must keep redirecting after successful provider-owned logout; otherwise staging can appear to do nothing after the click even when the POST path is called.

## Verification Already Run

- Read `AGENTS.md`.
- Read `requirements/clerk-auth-migration/design.md`.
- Inspected current auth files with `rg` and targeted file reads.
- Checked branch state with `git status --short --branch`.
- Checked recent commit state with `git log --oneline --decorate -5`.
- Reviewed the implementation plan and patched approved review decisions into the feature packet.
- Watched new auth tests fail before implementation because `provider-config` and `local-provider` were missing.
- `npm run test:auth` passed.
- `npm run build` passed.
- `AUTH_PROVIDER=local BASE_URL=http://localhost:3100 scripts/route-guards-smoke-test.sh` passed against a temporary local dev server.
- `AUTH_PROVIDER=local BASE_URL=http://localhost:3100 scripts/auth-smoke-test.sh` passed against a temporary local dev server.
- Watched new Task 2 auth tests fail before implementation for missing local user classification, null password-hash guards, and repository linking methods.
- `npm run test:auth` passed after Task 2.
- `npx prisma generate` passed after Task 2.
- `npm run db:postgres:check` passed after Task 2.
- `npm run build` passed after Task 2.
- Watched new Task 3 tests fail before implementation for missing `lib/auth/clerk-user-linker`.
- Watched new Task 3 tests fail before implementation for missing `lib/auth/stable-auth-routes`.
- `npm install @clerk/nextjs` installed `@clerk/nextjs@7.3.3`.
- `npm run test:auth` passed after Task 3.
- `npm run build` passed after Task 3.
- Watched new Task 4 tests fail first because `lib/auth/profile-completion` was missing.
- `npm run test:auth` passed after Task 4.
- `npm run build` passed after Task 4.
- `npx vercel env ls` on 2026-05-13 showed `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` present in both Preview and Production, and showed `AUTH_PROVIDER` plus Clerk route URL variables missing.
- `npx vercel env pull` to temporary files on 2026-05-13 did not expose sensitive Clerk key values for prefix validation; the temporary files were deleted.
- After the user updated and redeployed staging on 2026-05-13, `npx vercel env ls` showed `AUTH_PROVIDER` present in Preview.
- `npx vercel inspect https://recetas-bim34ew4r-luisfleitas-1188s-projects.vercel.app` showed deployment `dpl_DYmiT1ZWqtksQKT7Q83nZR5QCAQW` Ready and aliased to `https://staging.recetasfamilia.app`.
- `npx vercel curl /api/health --deployment https://recetas-bim34ew4r-luisfleitas-1188s-projects.vercel.app` returned healthy app, database, and Blob checks.
- `npx vercel curl /login --deployment https://recetas-bim34ew4r-luisfleitas-1188s-projects.vercel.app` rendered the local Recetas login form, not Clerk.
- `npx vercel curl /register --deployment https://recetas-bim34ew4r-luisfleitas-1188s-projects.vercel.app` rendered the local Recetas registration form, not Clerk.
- `npx vercel curl /sign-in --deployment https://recetas-bim34ew4r-luisfleitas-1188s-projects.vercel.app` returned a Next 404 page.
- `npx vercel curl /sign-up --deployment https://recetas-bim34ew4r-luisfleitas-1188s-projects.vercel.app` returned a Next 404 page.
- `npm run test:auth` passed on 2026-05-13 immediately before deploying the feature branch Preview.
- `npm run build` passed on 2026-05-13 immediately before deploying the feature branch Preview.
- `npx vercel deploy -y` created Ready feature Preview deployment `dpl_FyAsm3HBSJZXCPorgxZrX6SksA46` at `https://recetas-6ren6162z-luisfleitas-1188s-projects.vercel.app`.
- Vercel remote build for `dpl_FyAsm3HBSJZXCPorgxZrX6SksA46` completed successfully and included Clerk routes `/sign-in/[[...sign-in]]`, `/sign-up/[[...sign-up]]`, `/user-profile/[[...user-profile]]`, and `Proxy (Middleware)`.
- `npx vercel curl /api/health --deployment https://recetas-6ren6162z-luisfleitas-1188s-projects.vercel.app` returned healthy app and database checks.
- `npx vercel curl /sign-in --deployment https://recetas-6ren6162z-luisfleitas-1188s-projects.vercel.app` rendered the Clerk sign-in route shell.
- `npx vercel curl /sign-up --deployment https://recetas-6ren6162z-luisfleitas-1188s-projects.vercel.app` rendered the Clerk sign-up route shell.
- `npx vercel curl /login --deployment https://recetas-6ren6162z-luisfleitas-1188s-projects.vercel.app` returned a redirect to `/sign-in`.
- `npx vercel curl /register --deployment https://recetas-6ren6162z-luisfleitas-1188s-projects.vercel.app` returned a redirect to `/sign-up`.
- `npx vercel logs https://recetas-6ren6162z-luisfleitas-1188s-projects.vercel.app --since 2h --level error --expand` found digest `543091922`: `The column users.auth_provider does not exist in the current database`.
- `npx vercel deploy -y` created temporary migration deployment `dpl_5stdFWr42wjUvdQjtRTBb32iByRb` / `https://recetas-g3xyybww6-luisfleitas-1188s-projects.vercel.app`.
- `npx vercel curl /api/admin/run-clerk-auth-migration --deployment https://recetas-g3xyybww6-luisfleitas-1188s-projects.vercel.app -X POST ...` returned `{"ok":true,"columns":["auth_provider","auth_provider_user_id","profile_completed_at"]}`. The secret token is not recorded in docs.
- `npx vercel remove https://recetas-g3xyybww6-luisfleitas-1188s-projects.vercel.app --yes` removed the temporary migration deployment.
- `npx vercel curl /api/health --deployment https://recetas-6ren6162z-luisfleitas-1188s-projects.vercel.app` returned healthy checks after the migration.
- `npx vercel curl / --deployment https://recetas-6ren6162z-luisfleitas-1188s-projects.vercel.app` rendered the home page after the migration.
- `npx vercel logs https://recetas-6ren6162z-luisfleitas-1188s-projects.vercel.app --since 5m --level error --expand` showed no new Prisma `P2022` crashes; only existing pg SSL-mode warnings appeared.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/logout-button-client.test.ts` passed on `codex/feature/fix-staging-logout`.
- `npm run test:auth` passed with the logout client regression included.
- `npm run build` passed on `codex/feature/fix-staging-logout`.
- `npx vercel deploy -y` created Ready deployment `dpl_31oKCSHw2XTVyTty6bwqK2wjab5z` at `https://recetas-ady5h3dbb-luisfleitas-1188s-projects.vercel.app`.
- `npx vercel alias set recetas-ady5h3dbb-luisfleitas-1188s-projects.vercel.app staging.recetasfamilia.app` succeeded.

## Manual Testing Status

- Local smoke testing passed for route guards and auth API/recipe ownership flows.
- Hosted Clerk route-shell verification passed on the feature Preview.
- The hosted database now has the auth provider columns required for Clerk identity linking.
- Full interactive Clerk manual testing still needs a browser session for first-login linking, profile completion, protected API `409 PROFILE_INCOMPLETE`, and Clerk logout.

## Decisions Already Approved

- Use an auth provider model so Clerk stays replaceable.
- Default development to local JWT/password auth.
- Use `AUTH_PROVIDER=local|clerk`.
- Keep local `User.id` as the durable Recetas identity.
- Use `proxy.ts`, not `middleware.ts`, for Next.js 16 Clerk request interception.
- Keep Task 1 buildable by migrating async auth helper call sites in the same task as the local provider boundary.
- Add `profileCompletedAt: Date | null` to `AppAuthUser`.
- Use centralized completed-profile helpers instead of custom incomplete-profile checks in every route/page.
- Preserve compatibility contracts that intentionally use `user_id`: JWT payloads, `/api/auth/me`, smoke scripts, and Prisma/database mappings.
- Use a composite unique key on `(authProvider, authProviderUserId)`.
- Normalize email addresses before Clerk identity lookup, link, or create.
- Run identity linking and profile updates in database transactions.
- Treat local users explicitly as `authProvider = "local"` and `authProviderUserId = null`.
- Keep migration scripts straightforward for current dev/staging data because the app is not live.
- Include all required database migration scripts and update hosted Postgres schema verification.
- Lock profile-completion email to Clerk's primary email for Clerk-created users.
- Use Clerk for hosted registration, sign-in, and password management.
- Link Clerk users to local users by provider id first, then email.
- Do not require Clerk email verification for first implementation email linking.
- Keep bearer-token support local-provider only.
- Keep Clerk imports inside provider-owned files.
- Hosted Clerk browser validation is conditional on the user provisioning real Clerk env vars first.
- Add a dedicated slice to connect Clerk in Vercel Preview/staging and Production before hosted validation.

## Vercel Clerk Environment Slice

- Task 5 in `implementation-plan.md` now tracks Vercel Clerk environment setup separately from hosted QA.
- Preview/staging should use Clerk test keys.
- Production should use Clerk live keys only when production Clerk auth is intentionally enabled.
- Secret values must stay out of docs, logs, handoff, and checklist entries.
- Required Vercel vars for each Clerk-enabled hosted environment:
  - `AUTH_PROVIDER=clerk`
  - `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  - `CLERK_SECRET_KEY`
  - `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in`
  - `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`
  - `NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/`
  - `NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/`
- Observed Vercel state on 2026-05-13:
  - Preview has `AUTH_PROVIDER`, `CLERK_SECRET_KEY`, and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` names, but missing route URL variables.
  - Production has `CLERK_SECRET_KEY` and `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` names, but missing `AUTH_PROVIDER` and route URL variables.
  - Sensitive Clerk values were not printed or saved in docs; test/live prefixes remain user-confirmation items.
  - The latest staging deployment is healthy but still serves pre-Clerk local auth routes, so it is not a valid hosted Clerk validation target.
  - The feature Preview `https://recetas-6ren6162z-luisfleitas-1188s-projects.vercel.app` contains the Clerk branch code and is the current hosted Clerk route validation target.

## External Reference Notes

- Clerk server `auth()` is App Router only and requires `clerkMiddleware()`.
- Clerk Next.js env guidance includes `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`.
- Next.js 16 uses `proxy.ts` for request interception; Clerk still uses the `clerkMiddleware()` API from that file.
