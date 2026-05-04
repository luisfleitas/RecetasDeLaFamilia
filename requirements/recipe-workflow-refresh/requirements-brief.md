# Recipe Workflow Refresh Requirements Brief

## Current State

Recetas already has separate manual recipe creation and recipe import routes:

- `/recipes/new` renders the add-recipe form.
- `/recipes/import` renders the import workspace.
- The home left navigation already has an add-recipe shortcut.
- Import sessions can hydrate `/recipes/new?importSession=...`.
- Source documents already exist for import history and handwritten source images.

The approved direction is to make the user-facing workflow feel like one branded Add Recipe experience while preserving clean internal separation between page orchestration, import processing, form state, rich text editing, media handling, and persistence rules.

## Problem Statement

Recipe creation currently feels split between manual creation and import. The refreshed workflow should make Add Recipe the single left-menu destination, guide users through the right starting path, and land every path on one full recipe details form before the recipe is saved.

The updated experience must comply with the new Recetas look and feel, strict separation of concerns, stable UI ids where appropriate, mobile readiness, and the documentation-driven workflow under this feature folder.

## Approved Design Direction

Use the approved branded Option A guided workflow:

- Left menu Add Recipe opens a single Add Recipe destination.
- A top app bar remains visible in the page chrome.
- A wizard bar appears at the top of the add flow.
- Each wizard step is its own screen.
- Completed wizard steps are clickable and preserve entered/imported information.
- Future wizard steps are visible but disabled until available.
- Completed wizard steps use warm cream/orange styling, not green.
- Green is reserved for true success states such as import completion.

Visual companion mockup:

- `.superpowers/brainstorm/97016-1777911368/content/option-a-branded-guided-steps.html`

This mockup is a planning artifact only. The durable source of truth is this requirements brief and future implementation/QA docs in this folder.

## Wizard Paths

Manual path:

1. Start
2. Recipe details

Import path:

1. Start
2. Import source
3. Recipe details

Once the user moves past Start, the selected path is locked for that in-progress draft. If the user wants to switch from manual to import or import to manual, provide a clear start-over action rather than trying to preserve incompatible state.

## Functional Requirements

### Add Recipe Entry

- The left menu Add Recipe link must route to the unified Add Recipe workflow.
- The Start screen must let the user choose:
  - Import recipe
  - Start manually
- Manual selection advances directly to Recipe details.
- Import selection advances to Import source.

### Import Source

Import source must expose these options:

- Paste text
- Upload document/PDF
- Upload handwritten images

The import option selector should follow the Recetas secondary menu rule:

- horizontal tab/list layout
- active bottom border emphasis
- subtle hover state
- matching spacing, radius, and transition timing

On successful import processing:

- The app automatically advances to Recipe details.
- No separate Review import step is used in v1.
- Recipe details displays an import-complete success message.
- Imported title, ingredients, description, steps, language, and source media are loaded into the unsaved Add Recipe form.

On failed import processing:

- Stay on Import source.
- Show page-level or field-level error messaging.
- Preserve user-selected files/text where practical.

### Recipe Details

Recipe details is one long form for both manual and imported recipes. Imported recipes add an import-complete banner and imported media where applicable.

Section order:

1. Basic info
2. Sharing
3. Ingredients
4. Media
5. Description
6. Steps
7. Create action

The recipe remains unsaved until the user clicks Create Recipe. Do not create a draft recipe record in v1.

### Ingredients And Units

The ingredient unit field should become an autocomplete text box.

Starter canonical suggestions:

- cup
- teaspoon
- tablespoon
- can
- unit
- piece
- slice
- clove
- pinch
- dash
- bunch
- sprig
- package
- box
- jar
- bottle
- bag
- stick
- pound
- ounce
- gram
- kilogram
- milliliter
- liter
- quart
- pint
- gallon
- fluid ounce
- to taste
- other

Users can type custom units. Custom units become suggestions only within the current recipe being edited or created. They do not become global suggestions.

### Rich Text Editing

Description and steps must use simple rich text editing rather than raw Markdown/source editing.

Toolbar controls for v1:

- bold
- italic
- underline
- text size
- bulleted list
- numbered list
- link

Text sizes:

- Small
- Normal
- Large
- Heading

No source/edit-markup mode is required for v1.

The public recipe page renders formatted content only.

### Media And Source Images

Recipe details must use one combined Media section with groups:

- Recipe images
- Imported source pages

Imported source pages include handwritten image pages and PDF pages converted into source-image previews when technically feasible.

Source image controls in Recipe details:

- remove
- reorder
- choose as primary display image

Users can choose either a recipe image or an imported source image as the recipe primary display image.

If a source image is selected as primary, keep it as a source image and reference it as primary. Do not copy it into normal recipe images.

When recipe visibility is public, imported source images are publicly visible by default.

### Public Recipe View

Public recipe detail pages must show one Gallery section with groups:

- Recipe photos
- Imported source pages

Imported source pages should render as thumbnails. Clicking a thumbnail opens a reusable full-size modal carousel.

The modal carousel must support:

- full-size image viewing
- next image
- previous image
- close
- keyboard and accessibility basics

### Home/Landing Page Integration

The same reusable media modal carousel must be available from the home/landing page.

Home recipe cards should preserve their primary navigation behavior. Clicking the main card/image continues to open the recipe detail page as appropriate.

When visible source/media is available, a small grouped media/source action on the recipe card opens the modal carousel. This action must not hijack normal card navigation.

## Out Of Scope For V1

- Creating saved draft recipe records before Create Recipe.
- Global learning of user-entered custom units.
- Source/edit-markup mode for rich text fields.
- A separate Review import wizard step.
- Copying source images into normal recipe image storage when selected as primary.
- A dedicated source viewer page.

## Separation Of Concerns Requirements

Implementation must preserve strict logic/view separation:

- Page files should orchestrate routing, auth, feature flags, and prepared props.
- Wizard path/state logic should live in a focused hook, helper, or view model.
- Import parsing and session persistence remain in application/API modules, not view components.
- Ingredient unit suggestion logic should live outside JSX-heavy form components.
- Rich text editor behavior should be a reusable component with formatting state isolated from recipe persistence.
- Media/source image visibility and promotion rules should live in application services.
- Modal carousel should be reusable from recipe detail and home/landing surfaces.

## States To Cover

Desktop and mobile behavior must be defined and verified for:

- Start choice selection
- Manual path
- Import source empty state
- Import source processing state
- Import source error state
- Import success state
- Imported recipe details loaded state
- Recipe details validation errors
- Media empty state
- Media with recipe images only
- Media with source images only
- Media with both groups
- Public recipe gallery with grouped media
- Home card with media action
- Home card without media action
- Full-size modal carousel open/next/previous/close

## Approved Decisions

- Use guided Option A as the design direction.
- Use a wizard bar with one screen per step.
- Completed steps are clickable and preserve data.
- Future steps are visible but disabled.
- Completed wizard steps use warm cream/orange styling.
- Manual path is shorter than import path.
- Successful import skips review and goes straight to Recipe details.
- Recipe details is an unsaved Add Recipe form until Create Recipe.
- Manual and imported recipes share the same Recipe details layout.
- Recipe details uses one long form.
- Media combines recipe images and source images into grouped subsections.
- Source images can be selected as the primary display image without copying them.
- Public recipe page gallery uses grouped media.
- Source page thumbnails open a full-size modal carousel.
- The modal carousel is reusable from public recipe detail and home/landing recipe cards.

## Next Action

Create `requirements/recipe-workflow-refresh/implementation-plan.md` with implementation slices, architecture seams, data model/API changes, UI components, tests, and QA gates. Do not start implementation until the plan is reviewed and approved.
