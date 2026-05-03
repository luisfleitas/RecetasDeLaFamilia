# Home Navigation Refresh Requirements Brief

## Inputs Received
- Wireframe/source-of-truth structure: `https://bliss-coach-78479963.figma.site`
- Selected carousel placement: Option A, featured band above the existing recipe lists/tabs.
- Visual style direction: introduce a warmer cream/orange Recetas brand direction.
- Navigation constraint: route missing dedicated pages to the closest existing screens for this phase.
- Recetas UI workflow: follow `requirements/ui-workflow/ui-agents-workflow.md`.

## Problem Statement
The Recetas home page needs a logged-in navigation shell that makes families, owned recipes, account actions, and recipe discovery easier to reach while preserving the existing central recipe-list behavior. The update should feel warmer and more intentional without becoming a blind redesign.

## User Goals
- Quickly identify the current signed-in account.
- Open account actions from the user name in the top bar.
- See recent or featured recipe previews prominently through a carousel.
- Access up to six families and six owned recipes from a logged-in left sidebar.
- Continue using the current central recipe visibility tabs/lists without behavior regressions.
- See only public recipes when logged out.

## In Scope
- Home page top bar.
- Logged-in left sidebar.
- Featured recipe carousel above the current central recipe section.
- Logged-out home state.
- Warm cream/orange brand guidelines for future UI phases.
- Closest-existing-route navigation for pages that do not exist yet.

## Out Of Scope
- Creating dedicated Edit Family, Add Family, Manage Families, or Manage Recipes pages in this phase.
- Changing recipe visibility rules or permissions.
- Rebuilding the recipe list/tabs behavior.
- Adding search, filtering, notifications, avatars, analytics, or new profile functionality unless already supported by existing code.
- Reworking recipe detail, recipe edit, account, or family dashboard UI beyond links needed from the home shell.

## Functional Requirements
- Top bar:
  - Show the current user name on the top right when logged in.
  - Clicking the user name opens a dropdown with:
    - Edit Account Settings
    - Log Out
  - When logged out, show `Create Account` instead of the user name.
- Left sidebar:
  - Only visible when logged in.
  - The full left navigation menu is collapsible.
  - Use the selected Option A pattern: a compact left rail with a slide-out drawer when expanded.
  - Collapsed rail state preserves quick navigation with compact controls and accessible labels.
  - Expanded drawer state shows section labels, family names, recipe names, and edit links.
  - Contains a collapsible `Families` section.
  - Shows up to six families the user is part of.
  - Each family item shows family name and an `Edit` option.
  - Includes a `+` button next to `Families`.
  - Includes a `More` link at the bottom.
  - Contains a `Recipes` section.
  - Shows up to six recipes owned by the current user.
  - Each recipe item shows recipe name and an `Edit` option.
  - Includes a `+` button next to `Recipes`.
  - Includes a `More` link at the bottom.
- Central section:
  - Keep the grouped recipe tab/list approach.
  - Display recipes grouped by:
    - Public recipes
    - Family groups, with one tab per family name
    - Private recipes
  - Use the warm rounded tab-strip style approved from the user-provided reference image.
  - Keep group counts visible in each tab.
  - Keep the message on top, but change it to: `Hello {user Name} what should we cook today?`
  - When the user is not logged in, show the generic message: `Hello what should we cook today?`
  - Preserve existing public/family/private visibility behavior as the source of truth for recipe membership.
- Logged-out state:
  - Do not display the left sidebar.
  - Display only public recipes in the main content area.
  - Show `Create Account` in the top bar.
- Main content enhancement:
  - Add a featured/recent recipe carousel above the existing recipe lists/tabs.
  - Carousel supports horizontal navigation.
  - Each slide shows recipe image, recipe title, and optional short description.
  - If a recipe has no image, use a warm placeholder treatment rather than hiding the slide.

## Route Decisions For This Phase
- `Create Account`: `/register`
- `Edit Account Settings`: `/account/change-password`
- `Log Out`: existing logout behavior
- `+` family action: `/account/families`
- Family item `Edit`: `/account/families`
- Families `More`: `/account/families`
- Recipe item click: `/recipes/[id]`
- Recipe item `Edit`: `/recipes/[id]/edit`
- `+` recipe action: `/recipes/new`
- Recipes `More`: home recipe section anchor until a Manage Recipes page exists.

## UX Requirements
- Preserve fast recipe scanning as the primary task.
- Center tabs should feel like the approved reference: large rounded active tab, subtle icon/count affordances, horizontal overflow when needed.
- The personalized greeting should sit above the carousel and grouped recipe area without becoming a marketing hero.
- Sidebar should aid navigation without competing with the carousel or recipe lists.
- Sidebar collapse should reduce visual weight without hiding required navigation from keyboard and screen-reader users.
- Option A carousel should read as a featured band, not a full hero replacement.
- Dropdown and collapsible controls must be keyboard accessible.
- Empty states should be calm and useful:
  - No families: show a short empty message plus the `+` route.
  - No owned recipes: show a short empty message plus add-recipe route.
  - No carousel-capable recipes: do not render an empty carousel shell; keep central content visible.

## Mobile Requirements
- Left navigation uses the Option A rail/drawer pattern and is collapsed by default on smaller screens.
- Mobile users must have a clear control to expand or open the navigation drawer when logged in.
- Expanded mobile drawer must not permanently reduce the recipe-list content width.
- Carousel remains above recipe lists on mobile but should use a compact height.
- Top bar actions wrap cleanly without overlapping text.
- All tap targets should remain comfortably sized.

## Accessibility Expectations
- User dropdown uses a button with `aria-expanded` and clear menu semantics.
- Left navigation collapse control uses a button with `aria-expanded`, `aria-controls`, and a descriptive label.
- Families collapse control uses a button with `aria-expanded`.
- Carousel navigation buttons have descriptive labels.
- Images include recipe-title alt text or decorative handling for placeholders.
- Visible focus states must remain clear against the warm palette.

## Technical Constraints
- Continue loading home page data server-side through application/helper layers rather than client self-fetches for the primary page render.
- Reuse existing route patterns and application use cases where possible.
- Add stable IDs to newly created or modified UI elements.
- Follow the `AGENTS.md` separation-of-concerns rule:
  - Keep `app/page.tsx` focused on routing, auth-aware data loading, and passing prepared props.
  - Keep home navigation, account dropdown, sidebar rail/drawer, and carousel rendering in focused view components.
  - Keep ownership filtering, family summaries, featured-carousel selection, route decisions, and other business rules in `lib/application` or focused helper modules instead of JSX-heavy components.
- Modify existing home ownership files where they own the behavior; add new files only for focused components or helpers.

## Success Criteria
- Logged-in users see the warm top bar, user dropdown, left sidebar, featured carousel, and unchanged central recipe lists.
- Logged-in users can collapse and expand the Option A left navigation rail/drawer.
- Logged-out users see no sidebar, see `Create Account`, and only see public recipes.
- Sidebar lists cap at six families and six owned recipes.
- Carousel appears above the current recipe list area and supports horizontal navigation.
- Missing-route actions use the approved closest existing destinations.
- Brand guidelines are documented for future UI phases.
- Build and focused home-page verification pass before implementation is called complete.

## Approved Decisions
- Visual direction: warmer cream/orange brand direction.
- Carousel placement: Option A, above current recipe lists/tabs.
- Left navigation pattern: Option A, compact rail plus slide-out drawer.
- Missing dedicated pages route to closest existing screens for this phase.

## Open Questions
- None blocking design documentation. Implementation planning should confirm exact mobile sidebar behavior before coding.
