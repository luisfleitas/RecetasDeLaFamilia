# Recipe Import - Phase 1 Rollback Plan

## Immediate Rollback
1. Set `RECIPE_IMPORT_ENABLED=false`.
2. Redeploy application configuration.
3. Confirm `/recipes/import` and import API routes return not found behavior.

## Impact
- Existing recipes remain available.
- `/recipes/new` remains functional without import hydration.
- Previously created recipes and linked source documents remain intact.

## If A Create Regression Is Detected
1. Disable the flag immediately.
2. Verify normal recipe creation still succeeds without an import session.
3. Review recent import-session records and recipe create errors.

## If Source Document Promotion Fails
1. Disable the flag immediately.
2. Inspect `RecipeSourceDocument` rows with `importSessionId` set and `recipeId` null.
3. Run `npm run import:cleanup` to remove expired staging artifacts when appropriate.

## Data Safety Notes
- Import source files are staged privately before promotion.
- Recipe create path already contains rollback handling for failed post-create promotion.
- Cleanup of expired sessions is idempotent and safe to rerun.

## Re-enable Criteria
- Root cause identified.
- Import happy-path verification rerun successfully.
- Auth and source-document access checks reconfirmed.
