# Multi-Language Support QA Checklist

## Inputs Received
- [plan.md](/Users/luisfleitas/Personal%20Projects/Recetas/requirements/multi-language-support/plan.md)
- [implementation-plan.md](/Users/luisfleitas/Personal%20Projects/Recetas/requirements/multi-language-support/implementation-plan.md)
- Approved proof-scope design direction in [design-options.md](/Users/luisfleitas/Personal%20Projects/Recetas/requirements/multi-language-support/design-options.md)

## Assumptions
- QA is for the proof scope only.
- Supported UI locales are `en` and `es`.
- Supported recipe-language values are `en` and `es`.

## Deliverables
### Global locale behavior
- Verify default locale fallback when no locale cookie exists.
- Verify invalid locale cookie values fall back safely.
- Verify locale switcher is visible from the header on desktop.
- Verify locale switcher remains usable on mobile without clipping or overlap.
- Verify locale change persists after refresh.
- Verify locale change persists after navigation between home, login, recipe, and family screens.
- Verify `<html lang>` updates to match the selected locale.

### Shared chrome
- Verify home header copy changes in both locales.
- Verify secondary navigation labels change in both locales.
- Verify auth state pills and primary CTA labels change in both locales.
- Verify empty states and visibility-tab labels change in both locales.
- Verify visibility tabs keep the existing interaction pattern and do not regress keyboard behavior.

### Auth proof scope
- Verify login form labels, button text, loading state, success state, and error state in `en`.
- Verify the same states in `es`.
- Verify invalid credentials show localized copy rather than raw API English.
- Verify network failure fallback copy is localized.

### Recipe create/edit/import/detail proof scope
- Verify `Recipe language` control appears in create flow.
- Verify `Recipe language` control appears in edit flow.
- Verify `Recipe language` control appears in import review flow.
- Verify recipe language can be set to `English` and `Spanish`.
- Verify selected recipe language persists after create.
- Verify selected recipe language persists after edit.
- Verify recipe detail page shows the saved recipe language.
- Verify recipe language remains correct when UI language differs from recipe language.
- Verify localized validation copy appears for title, steps, ingredient, and sharing errors in both locales.
- Verify import review continues to work with localized UI copy.

### Family proof scope
- Verify dashboard loading, error, empty, and success states in `en`.
- Verify the same states in `es`.
- Verify invite flow status, retry, accept, decline, and conflict states in both locales.
- Verify no raw API English errors leak into touched family screens.

### Date and metadata formatting
- Verify home recipe dates format using selected UI locale.
- Verify recipe detail created-at timestamps format using selected UI locale.
- Verify family/invite timestamps in touched flows format using selected UI locale.
- Verify recipe language metadata does not affect date formatting.

### Accessibility basics
- Verify locale switcher is keyboard reachable.
- Verify locale switcher active state is announced correctly.
- Verify recipe-language controls in forms are keyboard reachable and visibly focused.
- Verify labels remain associated with their inputs.
- Verify no important state is conveyed by color alone.

### Mobile checks
- Verify header action row wraps cleanly with locale switcher visible.
- Verify recipe create/edit/import sections do not overflow horizontally.
- Verify metadata pills on recipe detail wrap cleanly.
- Verify family dashboard tabs and actions still fit under longer Spanish labels.

## Open Risks
- Mobile wrapping in the home header may need CSS adjustment after real translations are applied.
- Existing recipes without stored language may require explicit QA around hidden vs fallback display behavior.

## QA Run - 2026-04-24
### Automated checks
- Passed: `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/i18n-auth.test.ts scripts/i18n-family.test.ts scripts/recipe-language.test.ts`
- Passed: `npm run test:import`
- Passed: `npm run test:phase1`
- Passed: `npm run test:phase2`
- Passed: `npm run test:phase3`
- Passed: `npm run lint` with existing warnings only.
- Passed: `npm run build`
- Passed after applying local migration: `BASE_URL='http://localhost:3000' ./scripts/auth-smoke-test.sh`
- Passed after updating stale assertions: `BASE_URL='http://localhost:3000' ./scripts/route-guards-smoke-test.sh`
- Passed after updating the Phase 1 demotion expectation: `BASE_URL='http://localhost:3000' ./scripts/family-phase1-curl-smoke-test.sh`

### Browser checks
- Passed: default English home rendered with `<html lang="en">` before switching locale.
- Passed: locale switcher changed the UI to Spanish and updated `<html lang="es">`.
- Passed: Spanish locale persisted after refresh.
- Passed: Spanish locale persisted across home, login, new recipe, recipe detail, edit recipe, import, and family dashboard routes.
- Passed: recipe-language control appeared on new recipe, edit recipe, and import review after parsing a draft.
- Passed: recipe detail showed the recipe-language metadata pill.
- Passed: family dashboard rendered Spanish create/list/pending-invite copy.
- Passed: mobile viewport QA at 390x844 for Spanish home header wrapping, recipe new form, recipe detail metadata pills, recipe edit form, and family dashboard list/manage tabs; each checked without horizontal document overflow.
- Passed: rendered invite page localization in Spanish for active invite state, pending/declined/accepted decision states, accept/decline/undo-decline actions, retry/back link chrome, and raw English label regression checks.
- Passed: family API route audit for touched 4xx/client-facing paths confirmed stable `code` values are present; generic 500 catch-all responses may still include raw diagnostic messages, but touched UI clients map missing/unknown codes to localized fallback copy instead of rendering raw API English.
- Passed: generic family API 500 catch-all responses include stable `INTERNAL_ERROR` codes, verified by `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/i18n-family.test.ts`.
- Passed: final verification bundle on 2026-04-24:
  - `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/i18n-auth.test.ts scripts/i18n-family.test.ts scripts/recipe-language.test.ts`
  - `npm run test:import`
  - `npm run test:phase1`
  - `npm run test:phase2`
  - `npm run test:phase3`
  - `npm run lint` with existing warnings only
  - `npm run build`
  - `BASE_URL='http://localhost:3000' ./scripts/auth-smoke-test.sh`
  - `BASE_URL='http://localhost:3000' ./scripts/route-guards-smoke-test.sh`
  - `BASE_URL='http://localhost:3000' ./scripts/family-phase1-curl-smoke-test.sh`

### Follow-up status
- Completed: mobile viewport QA for Spanish header wrapping, recipe forms, recipe metadata pills, and family dashboard tabs/actions.
- Completed: invite accept/decline rendered-page localization pass outside the dashboard summary.
- Completed: generic family API 500 responses now return stable codes before PR.
- Completed: final automated verification bundle before PR.

## Next Agent Should Do
- Use this checklist during implementation validation.
- Add any route-specific checks discovered during slice work rather than broadening scope implicitly.
