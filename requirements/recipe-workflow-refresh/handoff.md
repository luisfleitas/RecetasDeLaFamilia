# Recipe Workflow Refresh Handoff

## Current State

Design direction approved for the unified Add Recipe workflow. The feature branch is `codex/feature/recipe-workflow-refresh`.

## Completed

- Started planning from `pre-main`.
- Created feature branch `codex/feature/recipe-workflow-refresh`.
- Explored the existing recipe creation/import/source-image code paths.
- Generated and iterated the branded visual mockup.
- Approved guided Option A with adaptive wizard paths and combined media handling.
- Wrote the requirements brief.
- Added recipe-workflow branding guidance for app chrome, forms, and create/edit/modify processes.

## In Progress

- Planning phase.

## Next Action

Write `requirements/recipe-workflow-refresh/implementation-plan.md` for review. The plan should break the work into small slices and preserve strict separation of concerns.

## Known Issues

- `.superpowers/` contains temporary visual companion files and should remain untracked.
- The current implementation has separate `/recipes/new` and `/recipes/import` routes; the implementation plan must decide whether to route both through a new unified page or progressively compose existing components into the Add Recipe workflow.
- The landing page now needs to adopt the approved top bar and left hand menu app frame.
- Current source image visibility defaults need to change for public recipes.
- Supporting source images as primary display images likely requires API/view-model changes because source images currently flow separately from recipe images.
- Rich text storage/rendering needs an explicit migration or compatibility plan because current fields are `description` and `stepsMarkdown`.

## Verification Already Run

- `git status --short --branch`
- Code/documentation inspection only. No tests have been run for this planning pass.

## Manual Testing Status

- Visual mockup reviewed in the in-app browser.
- Design approved by the user.

## Decisions Already Approved

- Left menu routes to Add Recipe.
- Import path: Start -> Import source -> Recipe details.
- Manual path: Start -> Recipe details.
- Completed wizard steps are clickable and preserve information.
- Future steps are visible but disabled.
- Path switching after Start should use a start-over action.
- Successful import automatically advances to Recipe details.
- No Review import step in v1.
- Recipe details remains unsaved until Create Recipe.
- One long Recipe details form.
- Ingredient units use autocomplete with local custom suggestions per recipe.
- Description and steps use a simple rich text toolbar.
- Combined Media section with Recipe images and Imported source pages groups.
- Source images can be primary without being copied.
- Public recipe gallery uses grouped media.
- Source thumbnails open a reusable full-size modal carousel.
- Modal carousel is also available from home/landing recipe cards through a separate media action.
- Landing page should use the new top bar and left hand menu layout.
- Branding guidance should cover form details plus create, edit, and modify processes.
