# Recipe Save QA Test Cases

## Current State
- Branch: `codex/feature/recipe-save-qa`
- Scope: local-only review and QA for creating and editing recipes before any production push.
- Review gate: wait for Luis to review local changes before promoting or pushing toward production.

## Test Data
- User: `alice` / `Password123!`
- Family member user: `bob` / `Password123!`
- Images: generated locally by `scripts/recipe-save-qa-smoke-test.sh`.
- Image count per exercised recipe flow: 3 create images, then 3 edit images.

## Create Recipe
- Create a public recipe with title, description, steps, ingredient, and 3 generated images.
- Assert the created recipe returns the saved title, description, steps, public visibility, 3 images, and the selected primary image.
- Assert an anonymous viewer can fetch the public recipe.
- Assert each generated image serves both full and thumbnail variants.
- Assert the home/list carousel data includes the recipe with the expected image count.

## Edit Recipe
- Update the same recipe to family visibility.
- Change title, description, steps, ingredient quantity, upload 3 more images, and select a new primary image.
- Assert the owner sees updated text, family visibility, family links, 6 images, and the new primary image.
- Assert Bob, as a member of the linked family, can fetch the family recipe.
- Assert an anonymous viewer cannot fetch the family recipe.
- Assert the home/list carousel data includes all 6 images for the authenticated owner.

## Visibility Propagation
- Update the recipe to private visibility with another text/ingredient change.
- Assert the owner can fetch the private recipe.
- Assert Bob cannot fetch the private recipe.
- Assert an anonymous viewer cannot fetch the private recipe.
- Assert family links are cleared after switching away from family visibility.

## Carousel-Specific Checks
- API-backed carousel data is verified through `/api/recipes?includePrimaryImage=true&includeImages=true`.
- Manual UI pass should confirm the previous/next carousel controls cycle through the images on the home recipe card after the smoke script creates data.

## Local Verification Commands
```bash
BASE_URL='http://127.0.0.1:3000' ./scripts/recipe-save-qa-smoke-test.sh
node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/phase1-use-cases.test.ts scripts/phase2-use-cases.test.ts scripts/phase0-image-service.test.ts
npm run build
```
