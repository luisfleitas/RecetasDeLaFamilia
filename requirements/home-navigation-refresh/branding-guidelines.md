# Recetas Warm Heritage Branding Guidelines

## Purpose
These guidelines define the warmer cream/orange UI direction selected for the home navigation refresh. Future phases should use this as a practical styling reference while preserving Recetas' existing clarity, accessibility, and task-first product behavior.

## Brand Feel
- Warm, familial, and archival.
- More kitchen-table than marketing landing page.
- Soft contrast, clear hierarchy, and gentle motion.
- Recipe images should feel inviting and useful, not decorative filler.

## Color System
Use warm neutrals as the base, orange as the primary accent, and sage as a supporting heritage color.
For refreshed home/workspace surfaces, override any inherited `data-theme="sage"` app tokens inside the local app frame so cards, controls, tabs, and panels stay in the warm cream/orange system.

| Role | Token Name | Hex | Usage |
| --- | --- | --- | --- |
| Page background | `--brand-cream-50` | `#fff9ef` | Main warm page background and quiet empty areas |
| Surface | `--brand-cream-100` | `#f8ecd8` | Panels, sidebar, soft cards |
| Muted surface | `--brand-cream-200` | `#efd8b9` | Hover surfaces, dividers, subtle bands |
| Primary accent | `--brand-orange-500` | `#c9682b` | Primary buttons, active states, key links |
| Soft accent | `--brand-orange-300` | `#e8a35e` | Carousel accents, badges, warm highlights |
| Strong accent | `--brand-orange-700` | `#8e3f1c` | Text accents, icon buttons, high-emphasis states |
| Text | `--brand-brown-900` | `#342116` | Primary text |
| Muted text | `--brand-brown-700` | `#6a4a34` | Secondary copy |
| Supporting accent | `--brand-sage-500` | `#5b7a52` | Secondary links, success-adjacent UI, family cues |
| Border | `--brand-line-warm` | `rgba(142, 63, 28, 0.18)` | Card, panel, and sidebar borders |

Do not use sage/green as the dominant page background for this refreshed home shell. Sage can remain a supporting heritage accent, especially for counts or secondary cues, but the page and workspace should read cream/orange overall.

## App Shell Layout
- Use a compact framed workspace rather than a marketing hero layout.
- The shell should use most of the available viewport width, with only a small outside page gutter.
- The first viewport should move directly from the utility top bar into the greeting, featured band, and recipe workspace.
- Do not add a separate hero section to task-first Recetas pages unless the user explicitly asks for a landing-page treatment.
- Avoid decorative background canvases, animated orbs, and radial ambient effects on task pages; use a quiet warm gradient or solid warm surface instead.
- Keep recipe scanning visible as early as possible.

## Typography
- Keep the app's existing sans-serif stack for UI controls and dense content.
- Continue using a restrained serif accent for page-level titles and featured recipe titles where it already fits the product.
- Do not scale type with viewport width.
- Avoid negative letter spacing.
- Use uppercase labels sparingly for section labels and small navigation headings.

## Shape And Depth
- Use `8px-12px` radius for most cards, controls, and sidebar list items.
- Use up to `16px-18px` radius for larger panels and carousel containers.
- Prefer soft shadows:
  - Panel: `0 18px 42px rgba(104, 61, 27, 0.14)`
  - Card: `0 10px 24px rgba(104, 61, 27, 0.10)`
- Avoid nested card-on-card compositions where a simple section or list item will work.

## Buttons And Links
- Primary action: orange fill, cream text, clear hover darkening.
- Secondary action: cream surface, warm border, orange/brown text.
- Icon-only controls should use clear symbols and accessible labels.
- Use existing secondary tab styling rules for secondary menus; do not create a competing menu style.

## Sidebar Pattern
- Sidebar background should be a warm cream surface distinct from the main content.
- Use the selected Option A pattern: a compact rail plus a slide-out drawer.
- Collapsed rail state should reduce width while keeping clear icon/control affordances, accessible labels, and focus order.
- Expanded drawer state should prioritize readable names and visible `Edit` actions.
- The drawer should feel like part of the warm navigation system, not a modal interruption.
- Section headers use small uppercase orange/brown labels.
- The expanded left navigation hide/collapse button should sit directly to the left of the `Families` heading.
- Family and recipe items should be compact, scan-friendly rows.
- `Edit` should be visible but lower-emphasis than the item name.
- The `+` family and recipe buttons should be compact orange circular actions aligned to the right of their section headers.
- Empty sidebar sections should use concise helper text and preserve the section structure.

## Top Bar Pattern
- Keep the top bar light and utility-focused.
- Brand/title stays on the left; account actions stay on the right.
- Logged-in user name behaves as a menu trigger.
- Logged-in top bar should show the always-visible language changer next to the signed-in person's name/menu trigger.
- Logged-in top bar should not include extra top-level recipe/family navigation or primary add actions unless a later approved design calls for them.
- Logged-out `Create Account` should read as the account action, not as a promotional hero CTA.

## Carousel Pattern
- Place the carousel above current recipe lists for the approved Option A layout.
- Treat it as a compact featured band, not as a hero replacement.
- Use large recipe imagery when available.
- If no image exists, use a warm placeholder surface with recipe title and subtle accent shapes or texture.
- Carousel controls should be compact circular buttons with clear focus states.
- Slides should show:
  - Recipe image or placeholder
  - Recipe title
  - Optional short description
- Do not let the carousel hide or replace the existing recipe list workflow.

## Center Recipe Grouping Pattern
- Keep recipes grouped in a horizontal tab strip.
- Active tab should use the warm orange gradient/accent treatment from the approved reference.
- Inactive tabs should stay quiet: cream surface, brown muted text, small icon cue, and visible count.
- Use rounded container edges and soft depth, but keep this as a navigation control rather than a decorative card stack.
- Recipe cards should use responsive columns such as `auto-fit/minmax(...)` so the list fills available workspace width.
- Preserve one tab for public recipes, one per visible family group, and one for private recipes.
- Use the greeting `Hello {user Name} what should we cook today?` above the center content for logged-in users.
- Use the greeting `Hello what should we cook today?` above the center content for logged-out users.

## Motion
- Keep motion subtle:
  - Hover lift: `translateY(-1px)` or `translateY(-2px)`
  - Transition timing: `150ms-220ms ease`
  - Carousel slide transitions should be calm and reduced-motion aware.
- Respect `prefers-reduced-motion`.

## Accessibility
- Maintain strong text contrast on cream surfaces.
- Do not rely on orange alone to communicate state.
- Preserve visible focus rings; use a warm outline or box-shadow that contrasts against cream.
- Navigation menus and carousel controls need semantic buttons and labels.

## Do
- Use warm cream surfaces with orange accents.
- Locally override inherited theme tokens when a touched page would otherwise leak green/sage surfaces into the warm app shell.
- Keep layouts practical and easy to scan.
- Use recipe images as meaningful content.
- Keep public/logged-in state differences explicit.
- Use existing Recetas route and data patterns.
- Preserve the `AGENTS.md` separation-of-concerns rule when applying these patterns: page files load and prepare data, view components render UI, and application/helper modules own business rules.

## Do Not
- Do not turn the home page into a marketing landing page.
- Do not use decorative gradients, blobs, or ornamental backgrounds as the primary visual language.
- Do not let the featured carousel become the page hero.
- Do not introduce a second secondary-menu style.
- Do not create large rounded cards inside other cards.
- Do not hide the current recipe list behavior behind the carousel.
