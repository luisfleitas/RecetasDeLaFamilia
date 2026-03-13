# Recipe Import - Phase 1 Staging Validation Runbook

## Purpose
Run this checklist on `pre-main` before promoting recipe import to `main`.

## Preconditions
- `RECIPE_IMPORT_ENABLED=true` in the staging environment.
- Valid authenticated test user available.
- Upload storage is writable and private.
- OpenAI credentials configured only if OCR fallback coverage is being validated.

## Validation Steps
1. Open `/recipes/import` while signed in.
   Expected: page loads and shows paste + file upload inputs.
2. Paste a valid recipe and parse it.
   Expected: structured preview appears with editable title, ingredients, and steps.
3. Edit the preview and continue to `/recipes/new`.
   Expected: edited values hydrate into the canonical recipe form.
4. Save the imported recipe.
   Expected: recipe is created successfully and import session is marked confirmed.
5. Import a `.txt` file and repeat the save flow.
   Expected: source document is linked to the created recipe and remains downloadable through authorized routes only.
6. Verify auth/access control with a second user.
   Expected: non-authorized user cannot list or download source documents for the created recipe.
7. Disable the feature flag and reload `/recipes/import`.
   Expected: the page and import API routes return not found behavior.
8. Exercise one error path.
   Expected: unsupported file type or invalid content returns a stable, actionable error message.

## Evidence To Capture
- Screenshots of import preview and hydrated `/recipes/new` form.
- API response samples for one successful parse and one denied source-document request.
- Confirmation that linked source documents exist only under recipe-owned storage keys.
- Note any warnings shown during import.

## Exit Criteria
- Paste flow succeeds.
- At least one file-based flow succeeds.
- Feature-flag-off path is confirmed.
- No auth or source-document access regression is observed.
