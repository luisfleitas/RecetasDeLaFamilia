# Home Navigation Refresh Handoff

## Current State
- Feature branch: `codex/feature/home-navigation-refresh`
- Implementation work has started and the first full buildable slice is complete.
- Production code has been changed for the home navigation refresh.
- The major visual-readiness rework is now implemented locally: the refreshed landing no longer uses a marketing-style hero or feature-promo sidebar, and the first viewport now follows the compact app-shell direction from the completed mockup.
- `home-hero-section` and `home-preservation-aside` are removed from the refreshed landing.
- `HomeCanvas` is no longer rendered on the home page; the page uses a quiet warm gradient plus a framed cream/orange app workspace.
- The home app frame locally overrides inherited sage theme tokens so recipe cards, tabs, and controls read warm cream/orange even while the broader app still has `data-theme="sage"`.
- The signed-in top bar is simplified to brand, always-visible language changer, and signed-in name/account menu. Extra signed-in top-level add/family/account tabs were removed.
- The featured carousel now renders as a compact featured band above the grouped recipe workspace instead of as a hero replacement.
- The recipe visibility tabs and recipe card grid now use a warmer app-workspace treatment with responsive columns.
- The implementation plan is updated through Task 11, with logged-in interactive verification completed for the seeded `alice` account.
- A responsive follow-up patch keeps the compact left rail available below the desktop breakpoint and turns the drawer into a mobile overlay.
- The current responsive review patch fixes the medium-width rail/greeting overlap, keeps top-bar action labels on one line, increases small circular controls to 40px, and adds safer carousel title wrapping.
- A collapsed-rail follow-up removes the duplicate family and recipe `+` buttons from the closed left menu while keeping those actions in the opened drawer headers.
- A drawer-close follow-up places a dedicated `<` close control directly to the left of the My families heading and keeps the rail toggle above the drawer stacking layer.
- Empty-state verification now covers a no-recipe logged-out home plus a logged-in user with no families or owned recipes.
- The deprecated `home-page-header` id/wrapper has been removed; the later `home-hero-section` has also been removed as part of the app-shell rework.
- `home-page-top-header` now uses the warm `home-utility-header` treatment instead of the old generic `surface-panel`.
- True 390px phone-width visual verification is complete after installing the local Chrome distribution needed by the resizable Playwright browser.
- A phone-width drawer follow-up hides the compact rail toggle while the mobile drawer is open so it cannot cover family or recipe rows; the drawer header close button remains the phone-width close control.
- Old green success/status treatments in touched home-navigation flows now use the approved warm cream/orange status treatment, while semantic error colors remain unchanged.
- Final visual readiness verification is complete.
- Code review fixes are applied for the shared shell leakage, page-level persistence/grouping logic, and featured carousel counter drift findings.
- Latest user-requested tweak removes the image carousel from the current home navigation workspace; the home page now flows from the greeting directly into the recipe groups beside the left navigation.
- Current tweak branch: `codex/feature/remove-left-nav-carousel`.
- The previous home-navigation refresh branch was already prepared separately; this branch should only carry the focused carousel-removal change and tracker update.
- The user approved:
  - warm cream/orange visual direction
  - carousel Option A: featured band above current recipe lists/tabs
  - left navigation Option A: compact rail plus slide-out drawer
  - closest-existing-route fallbacks for missing dedicated pages
  - center section grouped recipe tab approach with the warm rounded tab reference
  - greeting copy: `Hello {user Name} what should we cook today?`
  - logged-out greeting copy: `Hello what should we cook today?`
  - separation-of-concerns rule from `AGENTS.md`

## Completed
- Created visual review artifact:
  - `requirements/home-navigation-refresh/carousel-placement-options.html`
  - `requirements/home-navigation-refresh/left-menu-options.html`
- Created and updated design/planning docs:
  - `requirements/home-navigation-refresh/requirements-brief.md`
  - `requirements/home-navigation-refresh/branding-guidelines.md`
  - `requirements/home-navigation-refresh/left-menu-options.md`
  - `requirements/home-navigation-refresh/implementation-plan.md`
  - `requirements/home-navigation-refresh/qa-checklist.md`
  - `requirements/home-navigation-refresh/handoff.md`
- Implemented home navigation view-model helpers and tests:
  - `lib/application/home-navigation/view-model.ts`
  - `lib/application/home-navigation/page-home-navigation-loader.ts`
  - `scripts/home-navigation-view-model.test.ts`
- Implemented warm home shell UI pieces:
  - `app/_components/home-account-menu.tsx`
  - `app/_components/home-left-navigation.tsx`
  - `app/_components/home-featured-carousel.tsx`
- Updated existing home UI integration:
  - `app/page.tsx`
  - `app/_components/recipe-visibility-tabs.tsx`
  - `app/_components/logout-button.tsx`
  - `app/globals.css`
  - `lib/i18n/messages.ts`

## In Progress
- Carousel-removal review/publish readiness.

## Next Action
1. Optionally run a browser visual check for the signed-in home page to confirm the left navigation now sits beside recipe groups without the image carousel band.
2. Review the focused diff.
3. Stage, commit, push `codex/feature/remove-left-nav-carousel`, and open a PR back into `pre-main`.

## Known Issues
- Temporary Playwright screenshots and `.playwright-mcp/` metadata are ignored by `.gitignore` so they do not get staged accidentally.
- The stale local dev process on port 3000 was force-stopped after it stopped responding to `/` and `/login`; successful phone-width verification used a clean dev server on `http://localhost:3103/`.
- Final verification also used a clean dev server on `http://localhost:3105/`; stop that local process when it is no longer needed.
- Generated screenshot `home-nav-final-phone-logged-out.png` is ignored by `.gitignore` and should stay out of commits.

## Verification Already Run
- Documentation sanity checks were run with `rg`, `sed`, `wc`, and `git status`.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/home-navigation-view-model.test.ts` failed first because the module did not exist, then passed after implementation.
- `npm run build` passed after helper/CSS/i18n work.
- `npm run build` passed after component creation.
- `npm run build` passed after `app/page.tsx` wiring.
- `npm run build` passed after React checklist polish for the carousel image and logout menu semantics.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/home-navigation-view-model.test.ts` passed after final polish.
- `PORT=3101 npm run start` served the built app locally.
- Rendered logged-out markup check on `http://localhost:3101/` confirmed:
  - `Create Account` present.
  - featured carousel present.
  - left navigation absent.
  - recipe groups anchor present.
  - public recipe card present.
  - no duplicate rendered `id` attributes on the home page.
- Existing local dev server on `http://127.0.0.1:3000/` was healthy.
- In-app browser login with seeded `alice` completed and confirmed:
  - account trigger visible and account dropdown opens with settings and logout actions.
  - greeting renders as `Hello alice what should we cook today?`.
  - compact left rail is visible at the narrower in-app viewport.
  - left drawer opens and closes while toggling `aria-expanded`.
  - family and recipe add/edit/more routes match the approved fallback targets.
  - Families section collapses and expands with `aria-expanded`.
  - grouped tabs include Public recipes, the visible family tab, and Just for me.
  - grouped tab keyboard behavior works for ArrowLeft, ArrowRight, Home, and End.
- `npm run build` passed after the responsive left navigation patch.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/home-navigation-view-model.test.ts` passed after the responsive left navigation patch.
- In-app browser responsive review on `http://127.0.0.1:3000/` found the horizontal compact rail overlapping the logged-in greeting at the available narrow viewport.
- Patched `app/globals.css` so the below-desktop rail column uses `max-content`, then restores the 3.5rem desktop rail column at `1024px`.
- Patched `app/page.tsx`, `app/_components/home-left-navigation.tsx`, and `app/_components/home-featured-carousel.tsx` so top-bar actions stay on one line, circular controls are at least 40px, and carousel titles wrap safely.
- Patched `app/_components/home-left-navigation.tsx` so the collapsed left rail only shows the expand/collapse control.
- Patched `app/_components/home-left-navigation.tsx` so the expanded drawer includes a `<` close button beside the My families heading, wired to the same open state as the rail toggle.
- In-app browser screenshots after the patch confirmed the rail, greeting, carousel, and grouped tabs no longer overlap at the available narrow viewport.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/home-navigation-view-model.test.ts` passed after the responsive visual patch.
- `git diff --check` passed after the responsive visual patch.
- `npm run build` passed after the responsive visual patch.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/home-navigation-view-model.test.ts` passed after removing the duplicate collapsed-rail `+` buttons.
- `npm run build` passed after removing the duplicate collapsed-rail `+` buttons.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/home-navigation-view-model.test.ts` passed after adding the drawer close button.
- `npm run build` passed after adding the drawer close button.
- Browser verification for the drawer-close patch was attempted against `http://127.0.0.1:3000/` and remains blocked by the missing Chrome distribution error.
- Temporary empty-state verification used `tmp-home-navigation-empty-state.db`, a local `next start` server on `http://localhost:3102/`, and an `emptyuser` account with no recipes or family memberships.
- Logged-out empty-state markup confirmed `Create Account`, `home-empty-state-card`, readable empty copy, no left navigation, no rendered featured carousel, and no duplicate rendered `id` attributes.
- In-app browser verification logged in as `emptyuser`, opened the left navigation drawer, and confirmed the empty family and owned-recipe messages are visible.
- `npx playwright install chrome` completed after approval and unblocked the separate resizable Playwright browser.
- True phone-width logged-out review at 390x844 confirmed no document-level horizontal overflow, no top-bar/hero/carousel overlap, and clean wrapping for header actions and hero copy.
- True phone-width logged-in review at 390x844 with seeded `alice` confirmed the greeting, compact rail, carousel, grouped tabs, and drawer fit without document-level horizontal overflow.
- Initial phone-width logged-in drawer review found the compact rail toggle floating over drawer list content.
- Patched `app/_components/home-left-navigation.tsx` so the compact rail hides below the desktop breakpoint while the mobile drawer is open.
- Follow-up 390x844 drawer review confirmed family and recipe rows are unobstructed, drawer width fits the viewport, and the header close control closes the drawer.
- Removed deprecated `home-page-header`, refreshed `home-page-top-header` with warm utility styling, and verified rendered home no longer includes `#home-page-header`.
- Audited old green success/status treatments in touched home-navigation flows, then moved login, family invite, family-dashboard success messages, and home recipe visibility status labels to warm brand styling.
- Added `.gitignore` rules for generated Playwright visual-verification artifacts.
- Final 390x844 visual check on `http://localhost:3103/` confirmed no document-level horizontal overflow and confirmed `#home-page-top-header` still renders.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/home-navigation-view-model.test.ts` passed after the phone-width drawer patch.
- `git diff --check` passed after the phone-width drawer patch.
- `npm run build` passed after the phone-width drawer patch.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/home-navigation-view-model.test.ts` passed after the old green status cleanup.
- `git diff --check` passed after the old green status cleanup.
- `npm run build` passed after the old green status cleanup.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/home-navigation-view-model.test.ts` passed after the deprecated-header/top-header patch.
- `git diff --check` passed after the deprecated-header/top-header patch.
- `npm run build` passed after the deprecated-header/top-header patch.
- `npm run build` passed after the app-shell visual rework.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/home-navigation-view-model.test.ts` passed after the app-shell visual rework.
- `git diff --check` passed after the app-shell visual rework.
- Logged-out no-cookie rendered HTML check on `http://127.0.0.1:3104/` confirmed `#home-app-frame`, `#home-greeting-title`, `#home-featured-carousel`, and `#home-recipe-groups` render, while `#home-hero-section`, `#home-preservation-aside`, and `#home-page-top-header-tabs` do not render.
- In-app browser logged-in review with seeded `alice` on `http://127.0.0.1:3104/` confirmed the compact top bar, greeting, warm featured band, grouped recipe tabs, responsive recipe card grid, and absence of `home-hero-section`, `home-preservation-aside`, and `home-page-top-header-tabs`.
- A follow-up in-app browser screenshot caught inherited sage surfaces inside the warm shell; `app/globals.css` now overrides those tokens inside `#home-app-frame`, and the reloaded screenshot confirmed the cards and controls read cream/orange.
- Clean logged-out in-app browser review on `http://localhost:3105/` confirmed:
  - `Create Account` and login access render in an unauthenticated state.
  - logged-in left navigation does not render.
  - `#home-app-frame`, `#home-featured-carousel`, and `#home-recipe-groups` render.
  - `#home-hero-section` and `#home-preservation-aside` do not render.
- Side-by-side visual pass compared `https://bliss-coach-78479963.figma.site/`, `requirements/home-navigation-refresh/completed-home-page-mockup.html`, and the local implementation. The local page follows the approved completed warm app-shell mockup direction while retaining real Recetas data and logged-out behavior.
- 390x844 Playwright check on `http://127.0.0.1:3105/` confirmed no document-level horizontal overflow, no duplicate rendered `id` attributes, left navigation absent while logged out, and stable ordering from greeting to featured carousel to grouped recipe workspace.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/home-navigation-view-model.test.ts` passed during final cleanup.
- `git diff --check` passed during final cleanup.
- `npm run build` passed during final cleanup.
- Added a focused test for recipe visibility group construction outside `app/page.tsx`; watched it fail before implementation, then pass after extraction.
- Restored shared `body` and `.app-shell` defaults, scoped the wider warm home shell to `#home-page-main` and `.home-app-shell`, and moved home membership loading/group preparation into application helpers.
- Clamped featured carousel active/counter rendering so the displayed index cannot drift beyond the current slide list.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/home-navigation-view-model.test.ts` passed after review fixes.
- `git diff --check` passed after review fixes.
- `npm run lint` passed after review fixes with existing warnings only.
- `npm run build` passed after review fixes.
- Removed the `HomeFeaturedCarousel` render from `app/page.tsx` so the home navigation workspace no longer shows the image carousel band.
- `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/home-navigation-view-model.test.ts` passed after removing the home workspace carousel render.
- `git diff --check` passed after removing the home workspace carousel render.
- `npm run build` passed after removing the home workspace carousel render.

## Manual Testing Status
- Logged-out server-rendered smoke check completed via local production HTML.
- Logged-in interactive browser testing completed with seeded `alice`.
- Medium-width visual responsive review completed in the in-app browser with seeded `alice`.
- Empty public, family, and owned-recipe states verified with a temporary empty database and the `emptyuser` account.
- True phone-width visual testing completed in the separate resizable Playwright browser with logged-out and logged-in `alice` states at 390x844.
- Old green success/status cleanup completed for touched home-navigation flows.
- Deprecated header/top-header cleanup completed and browser-verified at 390x844.
- App-shell visual rework completed and browser-verified in the authenticated in-app browser with seeded `alice`.
- Final logged-out unauthenticated browser review, source/mockup side-by-side comparison, 390x844 phone-width check, duplicate-id check, focused test, whitespace check, and production build are complete.

## Decisions Already Approved
- Use `pre-main` as the base branch for this UI feature.
- Work branch is `codex/feature/home-navigation-refresh`.
- Use warm cream/orange branding.
- Carousel Option A was previously approved, but the latest user request supersedes it for the current home navigation workspace: do not render the image carousel beside the left navigation.
- Use left navigation Option A.
- Add `+` buttons to both Families and Recipes headers.
- Keep grouped center recipe tabs with Public recipes, family tabs, and Just for me/private grouping.
- Use `Hello {user Name} what should we cook today?` as the logged-in greeting.
- Use closest existing routes for missing dedicated pages:
  - family add/edit/more: `/account/families`
  - recipe add: `/recipes/new`
  - recipe edit: `/recipes/[id]/edit`
  - recipes more: `#home-recipe-groups`
