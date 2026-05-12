# Clerk Auth Provider Migration Design

## Status

Approved in chat on 2026-05-12 for implementation planning.

## Goal

Move hosted Recetas authentication to Clerk while preserving a replaceable provider model and the existing local authentication path for development. Clerk must own hosted credential screens and password management, but Recetas must continue to own app identity, app profile fields, authorization, and domain data.

## Approved Principles

- Use an auth provider model so the authentication stack can be replaced later.
- Keep Clerk references inside the Clerk provider boundary.
- Use Clerk screens for registration and password changes.
- Keep the existing JWT/password provider as the default development provider.
- Preserve existing app-owned user data and ownership relationships by keeping local `User.id` as the durable Recetas identity.

## Selected Approach

Build a provider session boundary plus a local identity linker.

The app will expose provider-neutral helpers that return Recetas auth data:

```ts
type AppAuthUser = {
  userId: number;
  username: string;
};
```

Pages, route handlers, domain services, recipe flows, family flows, import flows, and UI components should depend on app-level helpers rather than Clerk. The existing local provider reads the current Recetas JWT/cookie or bearer token. The Clerk provider reads Clerk session state, links or creates the matching local `User`, and returns the same `AppAuthUser` shape.

## Provider Selection

Use an explicit environment switch such as `AUTH_PROVIDER=local|clerk`.

- Default: `local`
- Development: default to `local` to preserve seed users, current smoke tests, local password login, and bearer-token script workflows.
- Hosted Clerk mode: select `clerk` explicitly and require Clerk environment variables.
- Unsupported provider values should fail clearly during provider construction.

## Provider Boundary

Only the Clerk provider implementation and provider-owned Clerk route wrappers may import Clerk SDK modules such as `@clerk/nextjs`.

Provider-neutral code may call:

- `getAuthUserFromRequest`
- `getOptionalAuthPageUser`
- `requireAuthPage`
- provider-owned login/register/change-password/logout route helpers

Provider-neutral code must not import Clerk from app pages, API routes, recipe/family/import services, or shared UI components.

## Data Model

Keep local `User.id` as the app identity for existing relationships:

- recipes
- recipe images
- source documents
- import sessions
- families
- family memberships
- family invites
- deletion workflows
- audit events
- metrics

Add provider identity fields to `User`, for example:

```prisma
authProvider       String? @map("auth_provider")
authProviderUserId String? @unique @map("auth_provider_user_id")
```

The implementation plan should choose between two password storage options:

- Preferred long-term: make `passwordHash` nullable so Clerk-backed users do not need a fake password hash.
- Lowest migration risk: keep `passwordHash` required and store a sentinel value for externally authenticated users.

The design preference is the nullable field because it accurately models externally authenticated users. The implementation plan should confirm migration and test impact before selecting it.

## Stable Routes

Recetas routes remain stable and provider-neutral.

`/login`

- Local mode: render the existing Recetas login form.
- Clerk mode: redirect or render a provider-owned entry into Clerk sign-in.
- Preserve a safe relative `next` path.

`/register`

- Local mode: render the existing Recetas registration form.
- Clerk mode: redirect or render a provider-owned entry into Clerk sign-up.
- Preserve a safe relative `next` path.

`/account/change-password`

- Local mode: render the existing Recetas change-password form.
- Clerk mode: send the user to the Clerk-managed account/security screen.

`/api/auth/logout`

- Local mode: clear the `recetas_access_token` cookie.
- Clerk mode: perform provider-owned Clerk sign-out behavior.
- UI logout controls should continue calling a Recetas-owned abstraction rather than Clerk directly.

## Identity Linking

On each authenticated Clerk request, the Clerk provider resolves the local user in this order:

1. Find a `User` by `authProvider="clerk"` and the Clerk user id.
2. If absent, find a `User` by the Clerk primary email.
3. If matched by email, attach `authProvider` and `authProviderUserId` to that local user.
4. If no match exists, create a new local `User`.
5. Return the local `User.id` and username as `AppAuthUser`.

Approved risk decision: email matching does not require Clerk email verification for the first implementation. This should be explicit in code comments and tests so it can be tightened later.

## Recetas Profile Completion

Recetas continues to own app profile fields:

- first name
- last name
- email
- username

When a Clerk user links to an existing Recetas user, keep the existing username.

When creating a new local user from Clerk data:

1. Try to derive a normalized username from Clerk username, email prefix, or name.
2. If the username is available and valid, create the local user as profile-complete.
3. If the username is missing, invalid, or collides, create the local user in a profile-incomplete state and redirect to a Recetas profile-completion page.

Protected app workflows should require both an authenticated user and a completed Recetas profile. Public routes should continue to work without auth.

## Bearer Tokens

Bearer-token support remains local-provider only.

- Local mode: continue accepting current Recetas JWT bearer tokens for scripts and existing tests.
- Clerk mode: use Clerk session cookies and provider-owned session resolution.
- Do not mint a Recetas JWT in Clerk mode for hosted users.

## Error Handling

- Missing Clerk session in Clerk mode should return the same app-level unauthorized result as local mode.
- Missing required Clerk environment variables should fail fast with a configuration error.
- Failed identity linking should not create partial ownership data.
- Username collisions should route to profile completion instead of failing the Clerk login.
- Unsafe `next` values should be ignored or replaced with `/`.

## Testing Strategy

Keep the existing local auth smoke tests under `AUTH_PROVIDER=local`.

Add focused tests for:

- provider factory defaults to local
- unsupported provider values fail clearly
- Clerk provider is the only Clerk import boundary
- provider-id identity match
- email identity match
- new local user creation from Clerk data
- username collision profile-incomplete path
- stable `/login`, `/register`, `/account/change-password`, and `/api/auth/logout` behavior in local mode
- provider-neutral route/page auth helpers returning the same `AppAuthUser` shape

Hosted Clerk validation will require real Clerk environment variables and browser/session-based testing. Existing bearer-token scripts should not be treated as Clerk-mode hosted coverage.

## Out Of Scope

- Migrating existing password hashes into Clerk.
- Replacing local `User.id` foreign keys with Clerk IDs.
- Adding direct Clerk imports to app pages, route handlers, or shared UI.
- Supporting hosted Recetas JWT bearer tokens in Clerk mode.
- Changing recipe, family, import, or audit authorization semantics beyond the auth source.

## Implementation Planning Notes

The implementation plan should keep changes incremental:

1. Introduce provider-neutral auth interfaces and factory tests.
2. Move the current JWT/password behavior behind the local provider without behavior changes.
3. Add user provider identity fields and profile-completion state.
4. Add the Clerk provider and route wrappers.
5. Update route/page helpers to resolve through the selected provider.
6. Add Clerk-mode linking and profile-completion tests.
7. Update docs, env guidance, and smoke-test expectations.
