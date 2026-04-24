# Multi-Language Support Plan

## Summary
Add multilingual support to Recetas in a way that fits the existing Next.js App Router architecture, preserves current UI patterns, and keeps rollout incremental. The first phase should establish a small translation foundation, normalize user-facing message handling, and prove the approach on a limited set of high-value flows before expanding further.

## Working Assumption
This effort is for the current branch goal: `codex/feature/multi-language-support`.

## Business Analysis Snapshot
### Problem statement
Recetas currently renders most user-facing text directly in page and component files, with `lang="en"` hardcoded at the root. User-visible copy is also returned from API routes and validation helpers in English. This makes the product effectively English-only and raises the cost of future language expansion because copy, validation messages, formatting behavior, and API/UI error handling are scattered across server pages, client components, and route handlers.

### Primary user goals
- Read and navigate the product in a preferred language.
- Complete core recipe and family workflows without mixed-language UI.
- See dates and times formatted for the selected locale.
- Receive validation and operational feedback in the selected locale.

### Primary personas
- Families sharing recipes across countries and languages.
- Household admins inviting relatives who may not prefer English.
- Recipe contributors creating content in their own language while using localized product chrome.

### In scope for this effort
- Locale selection and persistence.
- App-level translation architecture for server and client components.
- Recipe-level language metadata and a UI control for customers to set it on recipes.
- Localized shared UI chrome and selected high-value flows.
- Locale-aware date/time formatting.
- Localized validation and operational messages for touched flows.
- Empty, loading, error, and success states for touched flows.
- Stable internal error/message codes where localization is required.

### Out of scope for v1
- Translating recipe content created by users.
- Automatically translating recipe content based on the recipe language flag.
- Auto-detecting browser language on first visit.
- Localizing OCR/extraction prompts beyond preserving source recipe language.
- Full multilingual SEO and localized route strategy.
- Complete translation of every existing screen in the product.

## Codebase Findings
- Root layout hardcodes `lang="en"` in [app/layout.tsx](/Users/luisfleitas/Personal%20Projects/Recetas/app/layout.tsx:16).
- Home, auth, recipe, family, and invite flows contain inline English strings in both server and client components.
- Validation layers throw English messages directly in [lib/application/auth/validation.ts](/Users/luisfleitas/Personal%20Projects/Recetas/lib/application/auth/validation.ts:1), [lib/application/recipes/validation.ts](/Users/luisfleitas/Personal%20Projects/Recetas/lib/application/recipes/validation.ts:1), and family validation modules.
- Several client flows render API `error` strings directly, especially in [app/account/families/families-dashboard.tsx](/Users/luisfleitas/Personal%20Projects/Recetas/app/account/families/families-dashboard.tsx:133) and [app/invite/family/[token]/invite-family-flow.tsx](/Users/luisfleitas/Personal%20Projects/Recetas/app/invite/family/[token]/invite-family-flow.tsx:46).
- Some API logic currently depends on English error substrings to classify failures, notably [app/api/recipes/route.ts](/Users/luisfleitas/Personal%20Projects/Recetas/app/api/recipes/route.ts:195). That must be refactored before localized validation messages are introduced.
- Locale formatting is currently implicit through direct `toLocaleDateString()` and `toLocaleString()` usage across user-facing views.
- The existing visibility tabs and family secondary menus already define the reference secondary-menu pattern that must be preserved.

## Product Decisions To Lock Before Implementation
- Initial locales for v1: `en` and `es`.
- Initial recipe language options for v1: `en` and `es`.
- Locale persistence: cookie-based, server-readable.
- URL strategy for v1: keep current non-localized routes; do not introduce locale-prefixed URLs in this phase.
- Translation storage: typed in-repo dictionaries by domain.
- Error/message contract for touched flows: APIs must return stable codes; UI must localize user-facing messages from those codes. Do not rely on localized API free-text as the primary contract.
- Missing-key fallback: fall back to default locale in production and log missing keys in development only.
- Locale switcher placement: global header, implemented using existing Recetas styling patterns and preserving current secondary-menu conventions.
- Recipe language UX: add a recipe-level language flag in create, edit, and import review flows, and keep it distinct from the selected UI language.

## Approval-Driven Workflow For This Effort
### Phase 1: BA confirmation
- Confirm launch locales: `en` and `es`.
- Confirm recipe language options for v1: `en` and `es`.
- Confirm v1 proof scope is limited to shared chrome, auth, one recipe flow set, and one family flow set rather than every page.
- Confirm API/UI message contract will use stable codes plus localized UI rendering.

### Phase 2: UI research pack
- Inventory all user-visible strings in the initial proof scope.
- Identify shared chrome that should be translated once and reused.
- Inventory all touched API error/message responses and validation outputs.
- Inventory all recipe creation, edit, import, and detail touchpoints where recipe language should be set or displayed.
- Identify mobile risks for longer Spanish labels, especially header controls, tabs, pills, and stacked actions.

### Phase 3: Design exploration
- Produce one lightweight locale-switcher proposal in the header.
- Show desktop and mobile behavior.
- Confirm it does not introduce a new secondary-menu pattern.

### Phase 4: Design approval
- Approve the locale-switcher approach before coding UI changes.
- Status: Approved on 2026-04-21 with Option A plus the approved header dropdown and action-row modifications.

### Phase 5: Implementation planning
- Produce final touched-file map.
- Lock rollout order.
- Define message-code mapping approach for touched flows.
- Define fallback behavior for unsupported locale values and missing keys.

### Phase 6: Plan approval
- Approve implementation plan before code changes begin.

### Phase 7: Implementation
- Build typed i18n and message foundations first.
- Localize shared chrome and selected flows in slices.
- Keep each slice reviewable.

### Phase 8: QA validation
- Validate desktop and mobile.
- Validate all touched empty/loading/error/success states.
- Validate no secondary-menu regressions.
- Validate locale persistence, refresh behavior, and formatting.

## Recommended Technical Approach
### 1. Introduce a minimal i18n foundation
- Add a central locale config module with supported locales, default locale, cookie key, and normalization helpers.
- Add typed in-repo message dictionaries organized by domain.
- Add a small translation API that works for server-rendered code and client components without over-plumbing.
- Update the root layout to derive `lang` from the active locale.

### 2. Normalize message handling before feature translation
- Introduce stable internal error/message codes for touched validation and API flows.
- Refactor touched routes so status handling no longer depends on English message substrings.
- Keep internal codes stable regardless of locale.
- Let UI map those codes to localized user-facing strings.

### 3. Add locale persistence and retrieval
- Persist locale in a cookie.
- Read locale in server-rendered routes and layout.
- Expose a lightweight locale-change path, such as a server action or route handler.
- On locale change, refresh current UI so server and client content stay aligned.

### 4. Add shared formatting helpers
- Replace direct `toLocaleDateString()` and `toLocaleString()` calls in touched flows with shared helpers that accept the active locale.
- Centralize formatting for dates, datetimes, and count-sensitive labels where useful.

### 5. Add recipe-level language metadata
- Add a recipe language field that captures the language of the recipe content itself, separate from the customer's chosen UI language.
- Support setting and editing recipe language in create, edit, and import review flows.
- Display recipe language where it helps users understand the content they are opening or managing.
- Preserve the original recipe content language without attempting automatic translation in v1.

### 6. Prove the system on limited high-value surfaces
Initial proof scope:
- Shared homepage/header chrome and guest/auth controls.
- Login, registration, and change-password flows.
- Recipe homepage visibility labels, recipe language indicators, and one recipe authoring/view flow set.
- Family invite flow and core family dashboard states.

### 7. Expand only after proof is stable
- Extend domain by domain after the initial proof passes QA and does not create mixed-language behavior.

## Implementation Plan
### Slice 0: message and formatting foundation
- Create `requirements/multi-language-support/` planning artifacts.
- Add locale config, dictionaries, and translation helpers.
- Add shared locale formatting helpers.
- Introduce typed/stable message codes for touched auth, recipe, and family flows.
- Remove English-string-dependent error classification in touched routes.

### Slice 1: root locale and persistence
- Update root layout `lang`.
- Add locale cookie read/write support.
- Add locale normalization and fallback behavior.
- Add the approved locale switcher shell behavior without broad copy changes yet.

### Slice 2: shared chrome
- Localize homepage top-level chrome, guest/auth states, primary CTAs, shared labels, and global locale-switcher UI.
- Ensure mobile-safe wrapping and preserve established menu patterns.
- Add stable `id` attributes to newly introduced UI elements as needed.

### Slice 3: auth flows
- Localize login, register, and change-password screens.
- Convert touched auth route responses to stable codes plus localized UI rendering.
- Cover loading, validation, and failure states.

### Slice 4: recipe proof scope
- Add recipe language schema, model, validation, and API support.
- Add a recipe language UI flag/control to recipe create, edit, and import review flows.
- Localize recipe visibility labels, homepage recipe grouping labels, recipe detail metadata labels, and selected create/edit flow chrome.
- Display recipe language metadata in recipe detail and any selected summary surfaces where it improves clarity.
- Replace touched date/time formatting with shared helpers.
- Preserve the current visibility tab pattern exactly.

### Slice 5: family proof scope
- Localize families dashboard core sections, invite flow, invite status messaging, and touched deletion/invite operational messages.
- Ensure client-rendered API errors are localized through codes, not raw API English.
- Verify tab and action layouts under longer Spanish labels on mobile.

### Slice 6: polish and hardening
- Sweep remaining strings within touched routes.
- Add missing empty/loading/success/error translations.
- Add regression tests and a manual QA checklist.
- Decide whether to broaden scope after proof validation.

## File Areas Expected To Change
- `prisma/schema.prisma`
- `prisma/migrations/*`
- [app/layout.tsx](/Users/luisfleitas/Personal%20Projects/Recetas/app/layout.tsx)
- [app/page.tsx](/Users/luisfleitas/Personal%20Projects/Recetas/app/page.tsx)
- [app/login/page.tsx](/Users/luisfleitas/Personal%20Projects/Recetas/app/login/page.tsx)
- [app/register/page.tsx](/Users/luisfleitas/Personal%20Projects/Recetas/app/register/page.tsx)
- `app/account/change-password/*`
- `app/account/families/*`
- `app/invite/family/[token]/*`
- `app/recipes/new/*`
- `app/recipes/[id]/*`
- `app/recipes/import/*`
- `app/_components/*`
- [app/api/auth/login/route.ts](/Users/luisfleitas/Personal%20Projects/Recetas/app/api/auth/login/route.ts)
- `app/api/auth/register/route.ts`
- `app/api/recipes/route.ts`
- `app/api/recipes/[id]/route.ts`
- `app/api/family-invites/[token]/*`
- `app/api/families/[familyId]/invite-links/*`
- [lib/application/auth/validation.ts](/Users/luisfleitas/Personal%20Projects/Recetas/lib/application/auth/validation.ts)
- `lib/domain/recipe.ts`
- [lib/application/recipes/validation.ts](/Users/luisfleitas/Personal%20Projects/Recetas/lib/application/recipes/validation.ts)
- `lib/application/families/validation.ts`
- New locale/i18n modules under `lib/`

## Risks
- Mixed server/client rendering can produce duplicated translation plumbing if helpers are too heavy.
- Raw API error text can continue leaking English unless touched flows move to code-based contracts.
- Existing route logic that inspects English error text will regress if localization is introduced before typed errors/codes.
- Large client components like the family dashboard can become noisy if translation lookup is scattered inline.
- Longer Spanish labels may stress existing tab widths, pills, and action rows on small screens.

## Mitigations
- Keep the i18n layer intentionally small and repo-local.
- Translate by domain and shared component, not by giant page monoliths.
- Normalize touched validation/API message handling before translating UI.
- Add formatting helpers before broad feature localization.
- Treat mobile checks as part of every slice, not end-stage cleanup.
- Prefer passing compact translation objects or scoped helpers into large client components rather than importing the whole dictionary everywhere.

## QA Plan
- Verify locale switching, persistence, refresh behavior, and fallback behavior.
- Verify touched flows in `en` and `es` for empty, loading, error, and success states.
- Verify recipe create, edit, import, and detail flows preserve and display the selected recipe language correctly.
- Verify recipe language remains distinct from the current UI language when they differ.
- Verify dates and datetimes render according to selected locale.
- Verify no mixed-language output remains in touched proof-scope flows.
- Verify keyboard and screen-reader basics for the locale switcher.
- Verify existing secondary-menu and visibility-tab styling remains consistent.
- Verify unsupported locale cookie values safely fall back to default locale.

## Recommended Next Docs
- `requirements/multi-language-support/research-pack.md`
- `requirements/multi-language-support/design-options.md`
- `requirements/multi-language-support/implementation-plan.md`
- `requirements/multi-language-support/qa-checklist.md`

## Proposed Next Step
Run the compressed approval workflow for the proof scope:

1. Confirm `en` and `es` as launch locales.
2. Approve the API/UI message-code contract.
3. Produce one lightweight research pack and one locale-switcher design proposal.
4. Convert that into the final implementation plan before coding.
