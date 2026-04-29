# Multi-Language Support Research Pack

## Inputs Received
- Approved [plan.md](/Users/luisfleitas/Personal%20Projects/Recetas/requirements/multi-language-support/plan.md) for multi-language support.
- Recetas UI workflow requirements in [ui-agents-workflow.md](/Users/luisfleitas/Personal%20Projects/Recetas/requirements/ui-workflow/ui-agents-workflow.md).
- Existing code inspection across:
  - [app/page.tsx](/Users/luisfleitas/Personal%20Projects/Recetas/app/page.tsx)
  - [app/_components/recipe-visibility-tabs.tsx](/Users/luisfleitas/Personal%20Projects/Recetas/app/_components/recipe-visibility-tabs.tsx)
  - [app/login/page.tsx](/Users/luisfleitas/Personal%20Projects/Recetas/app/login/page.tsx)
  - [app/recipes/new/new-recipe-form.tsx](/Users/luisfleitas/Personal%20Projects/Recetas/app/recipes/new/new-recipe-form.tsx)
  - [app/recipes/[id]/page.tsx](/Users/luisfleitas/Personal%20Projects/Recetas/app/recipes/[id]/page.tsx)
  - [app/recipes/import/import-recipe-form.tsx](/Users/luisfleitas/Personal%20Projects/Recetas/app/recipes/import/import-recipe-form.tsx)
  - [app/account/families/families-dashboard.tsx](/Users/luisfleitas/Personal%20Projects/Recetas/app/account/families/families-dashboard.tsx)
  - [app/invite/family/[token]/invite-family-flow.tsx](/Users/luisfleitas/Personal%20Projects/Recetas/app/invite/family/[token]/invite-family-flow.tsx)

## Assumptions
- Launch locales are `en` and `es`.
- Recipe language choices for v1 are also `en` and `es`.
- V1 uses non-localized URLs and cookie-based locale persistence.
- The recipe language flag describes the language of recipe content, not the current UI language.
- We are improving the existing Recetas UI, not redesigning it.

## Deliverables
### Current UI Patterns Worth Preserving
- The home header already balances brand copy, primary action, auth state, and secondary navigation in a compact way. This is the best insertion point for a global locale switcher.
- The visibility tabs in [recipe-visibility-tabs.tsx](/Users/luisfleitas/Personal%20Projects/Recetas/app/_components/recipe-visibility-tabs.tsx) define the reference secondary-menu interaction:
  - horizontal layout
  - active bottom-border emphasis
  - hover lift and tinted background
  - compact uppercase labels
- Recipe forms already group content into `surface-card` sections with a title, short explanation, then field controls. Recipe language should reuse that pattern.
- Detail pages already use metadata pills and short uppercase supporting text. Recipe language display should reuse those rather than add a new decorative badge style.

### Current Codebase Realities That Affect Design
- Root locale is hardcoded in [app/layout.tsx](/Users/luisfleitas/Personal%20Projects/Recetas/app/layout.tsx:16).
- Many client flows consume API `error` strings directly, especially in families and invite flows. Localizing UI copy without changing API contracts would leak English.
- Recipe create and edit flows currently have no content-language field. The most natural insertion point is the existing “Basic info” section before sharing.
- Import review already asks the user to confirm content before continuing. That is a strong place to add recipe-language confirmation without creating another screen.
- Home and detail surfaces use direct `toLocaleDateString()` and `toLocaleString()` calls, so formatting will look inconsistent until shared helpers are introduced.

### User-Visible String Inventory By Proof Scope
#### Shared chrome
- Home header eyebrow, description, hero title, hero description.
- Add Recipe, Create Account, Log In, Account, My Families, Guest preview mode, Signed in as.
- Empty-state title and description.
- Recipe visibility tab labels and empty-state copy.

#### Auth
- Login page title, labels, submit states, success/error messages.
- Register and change-password flows will follow the same pattern and need equivalent treatment.

#### Recipe flows
- Create form section titles and descriptions.
- Field labels for title, description, visibility, family selection, images.
- Validation copy and submit failure states.
- Import parse/continue errors and handwritten review hints around the import flow.
- Detail page eyebrow, created-at label, visibility summary, gallery/ingredients/steps headings, metadata pills.

#### Family flows
- Families dashboard tab labels, action copy, empty/error/success states.
- Invite flow title, action buttons, status labels, retry states, and state-based messages.

### Recipe Language Touchpoints
- New recipe form:
  - add `Recipe language` directly under title/description in Basic info
  - use a two-option horizontal choice: `English` and `Spanish`
- Edit recipe form:
  - mirror create form placement and pattern
- Import review:
  - add `Recipe language` after parsed title/description and before continue
  - default from parser metadata later if available, otherwise default to `English`
- Recipe detail:
  - show a metadata pill such as `Language: English`
- Home cards:
  - optional in phase 1 if density allows; not required for first implementation slice

### Mobile Observations
- The home header action row already wraps; adding a locale switcher there is safe if the switcher is compact and placed after the main CTA.
- The existing secondary-tab strip works on mobile because it scrolls horizontally. Reusing that behavior for the locale switcher is safer than introducing a dropdown for v1.
- Recipe create/edit forms already stack sections vertically, so adding one compact language control in Basic info is low risk.
- Family dashboard is dense and already has long labels. Locale changes there are more likely to create wrapping problems than recipe forms.

### Recommended Design Rules For This Feature
- Keep the locale switcher in the home/header action area, not hidden in account settings.
- Reuse the visibility-tab visual language for any language selector that behaves like a small segmented control.
- Put recipe language in Basic info, not in Sharing.
- Keep recipe language separate from visibility and from import source visibility.
- Use short labels in v1: `EN`, `ES` for UI switcher; full labels `English`, `Spanish` in forms.
- Prefer metadata pills or short supporting text for recipe language display on detail pages.
- Do not add language flags as decorative country icons; use text labels because language is not equivalent to nationality.
- Cover empty, loading, error, and success states in every touched flow.

## Open Risks
- Long Spanish strings in home header and families flows can cause wrap collisions around actions and pills.
- If recipe language is shown on every card immediately, home card density may suffer on mobile.
- If import review defaults recipe language incorrectly, users may publish misleading metadata.
- If locale selectors use a brand-new UI pattern, the feature will break the existing Recetas consistency rule.

## Next Agent Should Do
- Use this research pack to finalize one lightweight design proposal.
- Keep the locale switcher in the header and the recipe-language control in recipe Basic info.
- Treat home cards as optional for recipe-language display in the first implementation slice unless spacing remains clean.
