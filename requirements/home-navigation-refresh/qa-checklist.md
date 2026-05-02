# Home Navigation Refresh QA Checklist

## Status Legend
- `[ ]` Not yet verified
- `[x]` Verified
- `[~]` Blocked or needs follow-up

## Automated Verification
- [x] `npm run build` passes after implementation.
- [x] `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/home-navigation-view-model.test.ts` passes.
- [x] No TypeScript errors from new home navigation components.
- [x] No duplicate `id` attributes introduced in the home page shell.

## Current Design Readiness Review
- [x] `home-hero-section` removed from the refreshed landing.
- [x] `home-preservation-aside` removed from the refreshed landing.
- [x] First viewport now moves from compact utility top bar into greeting, featured band, and grouped recipe workspace.
- [x] Logged-in top bar shows the language changer next to the signed-in name/menu control.
- [x] Extra signed-in top-level recipe/family/add actions and secondary top tabs removed.
- [x] Featured carousel tightened into a compact featured band above the recipe groups.
- [x] Decorative `HomeCanvas` background removed from the home page.
- [x] Home app frame locally overrides inherited sage theme tokens so the refreshed page reads warm cream/orange overall.
- [x] Page width increased to match the completed mockup's broader app-frame direction.
- [x] Recipe visibility tabs and recipe cards use the warm app-workspace treatment.
- [x] Showing recipes area now uses responsive card columns so more cards appear per row as workspace width allows.
- [x] `requirements/home-navigation-refresh/branding-guidelines.md` updated with the corrected warm app-shell direction.
- [x] Local browser review compared the implementation against `requirements/home-navigation-refresh/completed-home-page-mockup.html`.
- [~] Remaining final-readiness gap: repeat logged-out browser review in a clean unauthenticated browser context and do one more side-by-side pass against the external source wireframe before PR cleanup.

## Previous Design Readiness Findings
- [~] Original wireframe comparison is not ready: the source design at `https://bliss-coach-78479963.figma.site/` is a compact logged-in app shell with a persistent left navigation and simple central workspace, while the current app renders a large marketing-style hero before the recipe workspace.
- [~] Landing-page hierarchy needs rework: the current `home-hero-section` dominates the first viewport and delays the greeting, carousel, and recipe tabs, which conflicts with the requirement to preserve fast recipe scanning as the primary task.
- [~] `home-hero-section` should be removed from the refreshed landing instead of resized or restyled; the source intent is an app workspace, not a hero-led landing page.
- [~] `home-preservation-aside` should be removed from the refreshed landing; the feature-promo sidebar does not belong in the task-focused home workspace.
- [~] Logged-in left navigation needs composition review: the current collapsed state is a single floating menu button and the opened drawer overlays hero copy, so it does not yet feel anchored to the app shell shown in the source wireframe.
- [~] Left navigation hide/collapse control placement needs update: the hide button should sit directly to the left of the `Families` heading in the expanded left menu, matching the completed mockup.
- [~] Carousel height and placement need tightening: the current featured carousel behaves like a large hero/image block, while the approved direction says it should read as a featured band above the existing recipe lists rather than a full hero replacement.
- [~] Decorative background treatment needs review against Recetas UI rules: the current animated canvas/radial background pushes the page toward a decorative landing-page feel instead of the requested task-focused app surface.
- [~] Background color needs update: update the rendered landing background color because it reads green overall, but the approved direction is warm cream/orange; the background should support that warmer system instead of the old green/sage theme.
- [~] Page width needs update: the current rendered landing should use a larger portion of the available screen width, closer to the source/preview shell, instead of feeling like a narrow centered page.
- [~] Top bar is not implemented correctly: the source/header intent only had the signed-in person's name with a submenu for logout or password/account settings, but the current top bar includes extra primary actions and secondary navigation that should not be there.
- [~] Language changer placement needs update: the language changer button should always be visible for logged-in and logged-out users, and for logged-in users it should sit next to the signed-in name/menu button.
- [~] `home-visibility-tabs` / recipe visibility tabs need update: the grouped recipe tabs should be reviewed against the source/preview shell and refreshed with the same app-workspace treatment, not considered complete just because the mechanics and keyboard behavior pass.
- [~] Showing recipes section needs update: show more recipe cards in the visible recipe group and use responsive columns so the number of recipes per row adjusts to the available screen width.
- [~] Branding guidelines need update: `requirements/home-navigation-refresh/branding-guidelines.md` should capture the corrected warm app-shell direction so later Recetas pages can reuse the background, layout, top-bar, navigation, carousel/featured-band, tab, and status-surface rules.
- [~] Final implementation must be checked against `requirements/home-navigation-refresh/completed-home-page-mockup.html` before the home page is called ready.
- [~] Existing checklist items below verify mechanics and responsiveness, but they do not close the visual readiness gap against the original source wireframe.

## Logged-Out Home
- [x] Left rail/drawer is not rendered.
- [x] Top bar shows `Create Account`.
- [x] Public recipe content remains visible.
- [x] Non-public recipes are not displayed.
- [x] Featured carousel uses public recipes only when shown.
- [x] Public recipe empty state remains readable when no public recipes exist.

## Logged-In Top Bar
- [x] User name is visible on the top right.
- [x] Clicking the user name opens the account dropdown.
- [x] Account dropdown includes `Edit Account Settings`.
- [x] Account dropdown includes `Log Out`.
- [x] Dropdown is keyboard reachable and has visible focus states.
- [x] Top bar wraps cleanly at the available narrow in-app browser viewport.

## Left Navigation Option A
- [x] Compact rail renders for logged-in users.
- [x] Rail open/close button has `aria-expanded` and `aria-controls`.
- [x] Slide-out drawer opens from the rail.
- [x] Slide-out drawer closes without page navigation.
- [x] Families header shows `‹ Families` and a right-aligned `+` button.
- [x] Families section can collapse and expand.
- [x] Families list shows no more than six families.
- [x] Family `Edit` links route to `/account/families`.
- [x] Families `More` link routes to `/account/families`.
- [x] Recipes header shows a right-aligned `+` button.
- [x] Recipes list shows no more than six current-user-owned recipes.
- [x] Recipe item links route to `/recipes/[id]`.
- [x] Recipe `Edit` links route to `/recipes/[id]/edit`.
- [x] Recipes `More` link targets the home recipe groups anchor.
- [x] Empty family and owned-recipe states are concise and visible.

## Featured Carousel
- [x] Carousel appears above the grouped recipe tabs.
- [x] Carousel supports previous and next navigation.
- [x] Carousel slides include recipe title.
- [x] Carousel slides include recipe image when available.
- [x] Carousel slides show a warm placeholder when no image exists.
- [x] Carousel does not render an empty shell when no recipes are available.
- [x] Carousel controls have descriptive labels.
- [x] Carousel is compact and readable at the available narrow in-app browser viewport.

## Center Recipe Groups
- [x] Greeting appears above center content for logged-in users.
- [x] Greeting copy is `Hello {user Name} what should we cook today?`.
- [x] Logged-out greeting copy is `Hello what should we cook today?`.
- [x] Grouped tabs display `Public recipes`.
- [x] Grouped tabs display one tab per visible family.
- [x] Grouped tabs display `Just for me` for private recipes.
- [x] Counts are visible in each tab.
- [x] Tab style follows the warm rounded reference image.
- [x] Existing keyboard tab behavior still works: ArrowLeft, ArrowRight, Home, End.
- [x] Existing grouped recipe list behavior remains unchanged.

## Mobile And Responsive
- [x] Logged-in navigation defaults to compact/collapsed behavior on small screens.
- [x] Expanded mobile drawer does not permanently reduce recipe-list width.
- [x] Horizontal tab overflow works without clipping text at the available narrow in-app browser viewport.
- [x] Carousel, greeting, and recipe cards do not overlap at the available narrow in-app browser viewport.
- [x] All key tap targets are comfortably sized in the refreshed home-navigation controls.
- [x] Long family names and recipe titles truncate or wrap cleanly in the refreshed home-navigation controls.
- [x] True phone-width visual review completed at 390x844 in the separate Playwright browser.

## Visual Cleanup
- [x] `home-page-header` no longer appears in the rendered home page shell.
- [x] `home-page-top-header` uses the refreshed warm home-navigation design rather than the old generic page-header/surface-panel treatment.
- [x] Old green banner/status treatments have been audited in the touched home-navigation flows.
- [x] Banner-like success/status surfaces use the approved warm cream/orange system instead of the previous green treatment.
- [x] Semantic warning/error banners keep appropriate warning/error color treatment and accessible contrast.

## Accessibility
- [x] Account menu trigger uses menu semantics and `aria-expanded`.
- [x] Left navigation toggle has a descriptive accessible label.
- [x] Families collapse button has `aria-expanded`.
- [x] Carousel image alt text uses recipe title.
- [x] Placeholder slides do not expose misleading image alt text.
- [x] Focus states are visible against cream/orange surfaces.
- [x] Color is not the only active-state cue for tabs or controls.

## Manual Testing Status
- Automated and rendered logged-out checks have started.
- Logged-in interactive browser checks completed with the seeded `alice` account on the local app.
- Medium-width visual responsive review completed in the in-app browser with seeded `alice`.
- Empty public, family, and owned-recipe states verified with a temporary empty SQLite database and the `emptyuser` account.
- True phone-width visual review completed in the separate Playwright browser with logged-out and logged-in `alice` states at 390x844.
- Visual cleanup for deprecated header ids, refreshed top header, and old green success/status treatments is complete.

## Known Risks To Watch
- Existing `app/page.tsx` is already doing substantial grouping work; implementation must avoid embedding more business logic in JSX.
- The current recipe grouping component already owns keyboard behavior; restyling must preserve that behavior.
- Account dropdown may require a small `LogoutButton` prop addition to avoid duplicating logout logic.
- Browser verification should include both authenticated and unauthenticated states.
- The current page can pass automated and responsive checks while still missing the source wireframe's app-shell composition; future QA must include a direct screenshot comparison against the source design before calling the landing ready.
