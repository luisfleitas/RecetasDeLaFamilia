# Recipe Image Upload Feature Plan (Phase 1 + Phase 2)

## Summary
Add multi-image support to recipes with a principal image, server-side resizing, homepage principal snapshot display, file-type filtering, and image removal.
Implementation will reuse current stack: Next.js API routes, Prisma + SQLite, and existing ownership checks.
Storage strategy: pluggable storage provider abstraction with local storage now and S3-compatible backend support later, plus Prisma metadata and `sharp` processing.

## Confirmed Decisions
- Storage: pluggable provider (`local` now, future `s3`), DB stores backend-agnostic keys/metadata.
- API shape: optional include flag for principal image (`includePrimaryImage=true`).
- Resize profile: canonical `1200x800` JPEG + thumbnail `400x267` JPEG.
- Supported uploads: JPEG, PNG, WEBP input.
- Limits: max `8` images per recipe, max `10MB` per file.
- Principal fallback on delete: auto-promote first remaining image.
- UI scope: image management in both create and edit forms.
- Access: image viewing follows current recipe visibility (public read, restricted writes).
- Resize engine: add `sharp`.

## Technical Constraint (Extensibility)
- All image persistence/read/delete/URL generation must flow through a storage abstraction (for example `ImageStorageProvider`) selected by configuration (for example `IMAGE_STORAGE_DRIVER=local|s3`).
- Domain/use-case and API contracts must remain unchanged when switching storage backend.
- DB must store storage keys (not absolute local file paths) to stay backend-agnostic.
- Current implementation includes `LocalFileStorageProvider`; future S3 support is a new provider implementation only.

## Data Model Changes
Update `/Users/luisfleitas/Personal Projects/Recetas/prisma/schema.prisma`:

1. Add `RecipeImage` model:
- `id Int @id @default(autoincrement())`
- `recipeId Int` + relation to `Recipe` (`onDelete: Cascade`)
- `storageKey String` (backend-agnostic key for canonical 1200x800 JPEG)
- `thumbnailKey String` (backend-agnostic key for 400x267 JPEG)
- `originalFilename String`
- `mimeType String` (normalized input mime)
- `sizeBytes Int`
- `width Int`
- `height Int`
- `position Int`
- `isPrimary Boolean @default(false)`
- `createdAt DateTime @default(now())`
- `updatedAt DateTime @updatedAt`
- Indexes:
  - `@@index([recipeId, position])`
  - `@@index([recipeId, isPrimary])`
- Primary uniqueness invariant is enforced in service/use-case logic (single primary per recipe).

2. Add relation field on `Recipe`:
- `images RecipeImage[]`

## Storage Architecture
### Provider contract
Add interface (in infrastructure layer) with methods equivalent to:
- `putObject(key, buffer, contentType): Promise<void>`
- `getObjectStream(key): Promise<ReadableStream | Node stream>`
- `deleteObject(key): Promise<void>`
- `getPublicUrl(key): string`

### Providers
- Implement now: `LocalFileStorageProvider`
  - Writes to local base dir (for example `/Users/luisfleitas/Personal Projects/Recetas/uploads`).
- Prepare for future: `S3StorageProvider` skeleton/adapter point (optional stub only in this phase).

### Key format
- Canonical key: `recipes/<recipeId>/img_<imageId>.jpg`
- Thumb key: `recipes/<recipeId>/thumb_<imageId>.jpg`
- Provider maps keys to concrete location (filesystem path or S3 object key).

### Serving
- Keep route-based access:
  - `GET /api/recipe-images/:id/file?variant=full|thumb`
- Handler loads key from DB, reads via active provider, streams JPEG with cache headers.

## API and Contract Changes

### Existing endpoints
1. `GET /api/recipes`
- Add optional query: `includePrimaryImage=true`
- When set, each list item includes:
  - `primaryImage: { id, thumbnailUrl, fullUrl } | null`
- Default behavior unchanged when flag absent.

2. `GET /api/recipes/:id`
- Add optional query: `includePrimaryImage=true` (same shape as above).
- Optionally include full `images` when `includeImages=true` for edit UI hydration.

3. `POST /api/recipes`
- Accept multipart/form-data for create flow with images.
- Keep JSON support for backwards compatibility.
- Image fields:
  - `images[]` file parts
  - `primaryImageIndex` integer
- Enforce ownership (authenticated user).

4. `PUT /api/recipes/:id`
- Continue ownership check.
- Accept multipart/form-data for content + image mutations:
  - New files (`newImages[]`)
  - `primaryImageId` (or index for new batch before persistence)
  - `removeImageIds[]`
- Keep JSON-only recipe-content updates working.

### New endpoint
5. `DELETE /api/recipes/:recipeId/images/:imageId`
- Auth required; owner only.
- Deletes DB row + both stored variants through provider.
- Applies primary fallback rule (auto-promote first remaining image).

### Validation rules
- Reject unsupported mime/extensions (allow: jpg/jpeg/png/webp).
- Reject files > 10MB.
- Reject > 8 total images per recipe (existing + new).
- Normalize output format to JPEG variants (full + thumb).
- Enforce at most one primary image per recipe (service transaction logic).

## Application/Domain Layer Updates
Update:
- `/Users/luisfleitas/Personal Projects/Recetas/lib/domain/recipe.ts`
- `/Users/luisfleitas/Personal Projects/Recetas/lib/domain/recipe-repository.ts`
- `/Users/luisfleitas/Personal Projects/Recetas/lib/infrastructure/recipes/prisma-recipe-repository.ts`
- `/Users/luisfleitas/Personal Projects/Recetas/lib/application/recipes/use-cases.ts`
- `/Users/luisfleitas/Personal Projects/Recetas/lib/application/recipes/validation.ts`

Add:
- `RecipeImage`
- `PrimaryImageRef`
- Extended `RecipeListItem` with optional `primaryImage`
- Input DTOs for image operations (add/remove/select primary)

Add infrastructure modules:
- `/Users/luisfleitas/Personal Projects/Recetas/lib/infrastructure/images/image-storage-provider.ts`
- `/Users/luisfleitas/Personal Projects/Recetas/lib/infrastructure/images/local-file-storage-provider.ts`
- `/Users/luisfleitas/Personal Projects/Recetas/lib/infrastructure/images/image-service.ts`
- `/Users/luisfleitas/Personal Projects/Recetas/lib/infrastructure/images/storage-factory.ts`

Responsibilities:
- Validation + resize/crop via `sharp`
- Upload/delete via provider abstraction
- Safe cleanup on failure
- URL mapping stable across backends

## UI Changes

### Create form
File: `/Users/luisfleitas/Personal Projects/Recetas/app/recipes/new/new-recipe-form.tsx`
- Add multi-file picker (`accept="image/jpeg,image/png,image/webp"`).
- Preview uploaded selections.
- Select one as principal before submit.
- Client-side limit enforcement (count/size/type) matching backend.

### Edit form
File: `/Users/luisfleitas/Personal Projects/Recetas/app/recipes/[id]/edit/edit-recipe-form.tsx`
- Show existing images with:
  - “Set as principal”
  - “Remove”
- Add new uploads in same form.
- Submit mixed mutations in multipart payload.

### Homepage snapshot
File: `/Users/luisfleitas/Personal Projects/Recetas/app/page.tsx`
- Fetch list with `includePrimaryImage=true`.
- For each recipe card, render principal thumbnail above title when present.
- Keep current layout fallback when no image.

### Recipe detail page
File: `/Users/luisfleitas/Personal Projects/Recetas/app/recipes/[id]/page.tsx`
- Show principal full image near header.
- Optional secondary gallery rendering (if included in payload).

## Security/Authorization
- Editing images follows existing recipe ownership checks.
- Public read remains aligned with current public recipe visibility.
- Upload/delete/set-primary require auth + ownership.
- Validate mime by server-side sniffing (sharp metadata) plus declared type.
- Enforce safe storage keys (no user-controlled traversal/path injection).

## Migration and Rollout
1. Add Prisma migration for `RecipeImage` keys/metadata.
2. Add `sharp` dependency.
3. Add storage provider abstraction + local provider.
4. Ship API backwards-compatible with existing JSON recipe create/update.
5. Roll out UI in create/edit pages.
6. Enable homepage principal thumbnails.
7. Optional orphan-cleanup script for stale keys.

## Test Plan

### Unit tests
- Validation:
  - reject unsupported types
  - reject oversize files
  - reject >8 images
- Primary selection invariants:
  - one primary per recipe
  - fallback on delete
- Resize outputs:
  - full image dimensions exactly 1200x800
  - thumb dimensions exactly 400x267
  - output format JPEG
- Storage abstraction:
  - service works with provider mock
  - key-based operations independent of provider type

### Integration tests (API)
- Create recipe with multiple images and explicit primary.
- Create with invalid file type returns 400.
- Update recipe adding/removing images and switching primary.
- Delete primary image triggers auto-promotion.
- Unauthorized image mutations return 401.
- Non-owner mutation returns 403.
- `GET /api/recipes?includePrimaryImage=true` includes correct `primaryImage`.
- `GET /api/recipe-images/:id/file` streams from provider using DB key.

### UI scenarios
- Create flow:
  - upload multiple images, pick principal, submit success.
- Edit flow:
  - remove image, switch principal, save success.
- Homepage:
  - principal snapshot visible when exists; graceful empty state when not.

## Acceptance Criteria
- Users can attach up to 8 images per recipe.
- Exactly one principal image exists whenever recipe has images.
- Principal snapshot appears on homepage recipe card.
- Unsupported types and oversize files are blocked client and server side.
- Only recipe owners can add/remove/set principal images.
- API supports optional retrieval of principal image without forcing larger default payloads.
- Existing non-image recipe create/update flows keep working.
- Storage backend can be changed by config without changing domain/use-case/API code.

## Assumptions and Defaults
- Adding npm dependencies is allowed; no new external infra required for initial rollout.
- Local provider is the default runtime backend.
- Public image read access is intentional because recipes are currently publicly readable.
- Canonical crop to 3:2 is acceptable for consistent snapshots.
- S3 backend is not required in this phase, but architecture must make it a drop-in provider addition.
