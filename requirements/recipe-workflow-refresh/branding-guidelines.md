# Recipe Workflow Refresh Branding Guidelines

## Purpose

These guidelines extend the Recetas warm heritage direction for the unified Add Recipe workflow, home/landing app chrome, recipe forms, media handling, and create/edit/modify flows.

Use this file with:

- `requirements/recipe-workflow-refresh/requirements-brief.md`
- `requirements/home-navigation-refresh/branding-guidelines.md`
- the approved visual mockup at `.superpowers/brainstorm/97016-1777911368/content/option-a-branded-guided-steps.html`

The mockup is visual evidence. This file is the durable planning reference for future implementation.

## App Chrome

Use the approved top bar and left hand menu placement across the landing page and Add Recipe workflow.

Top bar:

- Brand lockup sits on the left.
- Language and account actions sit on the right.
- Keep the top bar utility-focused; it should frame the workspace, not become a marketing header.
- Use warm cream surfaces, warm borders, and restrained shadow.
- Keep account/language actions compact and scan-friendly.

Left hand menu:

- Use the compact rail plus drawer pattern.
- Keep the rail on the left side of the workspace on desktop.
- Preserve a clear Add Recipe action in the rail/drawer.
- The drawer should feel attached to the app frame, not like a separate modal.
- Use warm cream/orange styling for active and completed navigation states.
- Keep green out of navigation completion states; reserve green for true success messaging.

Landing page:

- Update the landing page to use the new top bar and left-menu app frame.
- Preserve the landing page as the task-first recipe browsing surface.
- Do not turn the landing page into a marketing page.
- Recipe cards keep their normal navigation behavior.
- A small source/media action on a recipe card may open the reusable media modal carousel when visible source/media exists.

## Color And State Language

Use warm neutrals as the base, orange as the active/primary accent, and sage/green only for true success or confirmation states.

- Page and panel background: warm cream.
- Primary actions: orange fill with cream text.
- Secondary actions: cream surface, warm border, brown/orange text.
- Completed wizard steps: warm cream background, orange border/text, filled orange number or check marker.
- Current wizard step: stronger orange border/accent.
- Disabled future wizard steps: visible but reduced opacity and non-interactive.
- Success states: soft sage/green, such as `Import complete`.
- Warning states: soft amber, never the same green used for success.
- Error states: red-tinted alert styling with clear text.

## Wizard Pattern

Use a top wizard bar for Add Recipe flows.

- Each wizard step is its own screen.
- Manual path: `Start -> Recipe details`.
- Import path: `Start -> Import source -> Recipe details`.
- Completed steps are clickable and preserve entered/imported information.
- Future steps stay visible but disabled until ready.
- Once the user moves beyond Start, the chosen path is locked for that in-progress draft.
- Switching manual/import paths should use a clear start-over action.
- Successful import automatically moves to Recipe details.
- Do not include a separate Review import step in v1.

## Form Details

Recipe forms should feel calm, task-first, and easy to scan.

Structure:

- Use one long Recipe details form for manual and imported recipes.
- Section order: Basic info, Sharing, Ingredients, Media, Description, Steps, Create action.
- Keep section headings short and practical.
- Place explanatory copy under the heading only when it helps the user complete the section.
- Avoid nested card-on-card layouts. Use grouped sections and simple bordered subsections instead.
- Keep desktop layouts efficient, but collapse cleanly to one column on mobile.

Inputs:

- Use consistent `input-base` styling or its refreshed equivalent.
- Labels should be visible and explicit.
- Required states and validation errors should appear near the relevant field.
- Keep helper text concise and below the field or section.
- Add stable `id` attributes to new or modified form elements where appropriate.

Ingredients:

- Unit field is an autocomplete text box, not a strict select.
- Use canonical suggestions from the requirements brief.
- User-entered custom units become suggestions only within the current recipe.
- Keep quantity, unit, notes, and name editing compact on desktop and stacked on mobile.

Media:

- Use one Media section with grouped subsections.
- Groups: Recipe images and Imported source pages.
- Either group can provide the primary display image.
- If a source image is selected as primary, keep it in source-image storage and reference it as primary.
- Public recipes show imported source pages publicly by default.

## Process For Creating Recipes

Creating starts from the left hand menu Add Recipe action.

Manual create flow:

1. Open Add Recipe.
2. Select Start manually.
3. Wizard switches to `Start -> Recipe details`.
4. User completes the one long Recipe details form.
5. User clicks Create Recipe.

Import create flow:

1. Open Add Recipe.
2. Select Import recipe.
3. Wizard switches to `Start -> Import source -> Recipe details`.
4. User chooses Paste text, Document/PDF, or Handwritten images.
5. System processes the source.
6. On success, system automatically lands on Recipe details.
7. Recipe details shows an import-complete success message.
8. Imported values and source pages are editable before save.
9. User clicks Create Recipe.

Do not create a saved draft recipe record before Create Recipe in v1.

## Process For Editing Recipes

Editing an existing recipe should use the same form language as Recipe details.

- Keep the app chrome consistent with the new top bar and left menu where the edit surface uses the app frame.
- Use the same section order where practical: Basic info, Sharing, Ingredients, Media, Description, Steps, Save action.
- Keep description and steps field placement consistent between create and edit. Editor UX is deferred to a separate phase.
- Keep ingredient unit autocomplete consistent between create and edit.
- Existing media should appear in the combined Media section.
- Imported source pages should remain grouped separately from recipe images.
- Editing should preserve existing visibility rules unless the user changes recipe visibility.
- When a public recipe has visible source pages, the edit form should communicate that those source pages are publicly viewable.

## Process For Modifying Imported Media

Modification applies to source pages and recipe images inside the combined Media section.

- Users can remove media where permissions allow.
- Users can reorder media within its group.
- Users can choose a recipe image or a source image as the recipe primary display image.
- Source images selected as primary remain source images.
- PDF pages should become source-image previews when technically feasible.
- Handwritten pages should preserve import order by default.
- The public recipe detail page shows grouped media: Recipe photos and Imported source pages.
- Imported source page thumbnails open the reusable full-size modal carousel.
- The modal supports previous, next, close, keyboard handling, and accessible labels.
- Home/landing recipe cards can expose a separate media/source action that opens the same modal without replacing card navigation.

## Process For Modifying The Workflow

Future changes to this workflow should follow the documentation and approval process:

1. Update the requirements brief or handoff with the proposed change.
2. Update this branding guide when the change affects page chrome, forms, media, wizard behavior, or user-facing process.
3. Update implementation and QA plans before coding.
4. Preserve strict separation of concerns for every touched file.
5. Verify desktop and mobile states for every touched flow.

## Implementation Notes

- Keep page files focused on routing, auth, flags, and prepared props.
- Move wizard behavior into a hook, helper, or view model.
- Move ingredient unit suggestions outside JSX-heavy components.
- Keep description and steps storage compatible with the existing recipe fields; defer editor behavior decisions to a separate phase.
- Keep media/source image rules in application services.
- Use the same modal carousel component from public recipe detail and home/landing pages.
