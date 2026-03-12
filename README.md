# Local setup and project usage notes.
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Database setup

Run Prisma migrations and seed data:

```bash
npx prisma migrate deploy --config prisma.config.ts
npx prisma db seed --config prisma.config.ts
```

Seeded credentials for MVP testing:

- `alice` / `Password123!`
- `bob` / `Password123!`

Set `JWT_SECRET` in `.env` before using auth endpoints.

## Recipe import configuration

Recipe import supports local-first OCR with optional OpenAI OCR fallback.

Environment variables:

- `OPENAI_API_KEY`:
  - required for OpenAI OCR fallback and OpenAI-based extraction
- `RECIPE_IMPORT_ENABLED`:
  - enables the import feature
  - defaults to `true`
- `RECIPE_IMPORT_EXTRACTOR_DRIVER`:
  - `rule-based` (default)
  - `openai`
- `RECIPE_IMPORT_OCR_CONFIDENCE_THRESHOLD`:
  - local OCR confidence threshold before falling back to OpenAI
  - defaults to `0.8`
- `RECIPE_IMPORT_OCR_OPENAI_MODEL`:
  - OpenAI model used for OCR fallback
  - defaults to `gpt-4.1-mini`
- `RECIPE_IMPORT_FORCE_OPENAI_OCR`:
  - when `true`, bypasses local OCR and forces the OpenAI OCR path
  - for PDFs, this also skips the text-layer shortcut and sends the rendered preview image to OpenAI

Example:

```bash
OPENAI_API_KEY=your_openai_api_key
RECIPE_IMPORT_ENABLED=true
RECIPE_IMPORT_EXTRACTOR_DRIVER=rule-based
RECIPE_IMPORT_OCR_CONFIDENCE_THRESHOLD=0.8
RECIPE_IMPORT_OCR_OPENAI_MODEL=gpt-4.1-mini
RECIPE_IMPORT_FORCE_OPENAI_OCR=true
```

## Image upload configuration

Recipe image upload/storage uses a pluggable storage backend.

Environment variables:

- `IMAGE_STORAGE_DRIVER`:
  - `local` (default, implemented)
  - `s3` (reserved for future provider implementation)
- `IMAGE_STORAGE_LOCAL_ROOT`:
  - local filesystem root for image objects
  - defaults to `<repo>/uploads`

Current image constraints:

- Max `8` images per recipe.
- Max `10MB` per image.
- Accepted upload source types: `image/jpeg`, `image/png`, `image/webp`.
- Canonical output variants:
  - full: `1200x800` JPEG
  - thumbnail: `400x267` JPEG

## Image APIs

### List recipes with principal image

```bash
curl -s "http://localhost:3000/api/recipes?includePrimaryImage=true"
```

### Get recipe with principal image and full image list

```bash
curl -s "http://localhost:3000/api/recipes/1?includePrimaryImage=true&includeImages=true"
```

### Create recipe with images (multipart)

```bash
curl -X POST "http://localhost:3000/api/recipes" \
  -b /tmp/recetas.cookies \
  -F "title=Recipe" \
  -F "description=Desc" \
  -F "stepsMarkdown=Step 1" \
  -F 'ingredients=[{"name":"Salt","qty":1,"unit":"tsp","notes":"","position":1}]' \
  -F "primaryImageIndex=0" \
  -F "images=@/absolute/path/a.jpg;type=image/jpeg" \
  -F "images=@/absolute/path/b.png;type=image/png"
```

### Update recipe with new images (multipart)

```bash
curl -X PUT "http://localhost:3000/api/recipes/1" \
  -b /tmp/recetas.cookies \
  -F "title=Recipe Updated" \
  -F "description=Desc" \
  -F "stepsMarkdown=Step 1" \
  -F 'ingredients=[{"name":"Salt","qty":1,"unit":"tsp","notes":"","position":1}]' \
  -F "primaryImageId=10" \
  -F "newImages=@/absolute/path/c.webp;type=image/webp"
```

### Delete image from recipe

```bash
curl -X DELETE "http://localhost:3000/api/recipes/1/images/10" \
  -b /tmp/recetas.cookies
```

### Fetch image assets

```bash
curl -o /tmp/full.jpg "http://localhost:3000/api/recipe-images/10/file?variant=full"
curl -o /tmp/thumb.jpg "http://localhost:3000/api/recipe-images/10/file?variant=thumb"
```

## Storage provider extension (future S3)

Current provider wiring:

- Interface: `lib/infrastructure/images/image-storage-provider.ts`
- Local provider: `lib/infrastructure/images/local-file-storage-provider.ts`
- Factory/env selection: `lib/infrastructure/images/storage-factory.ts`

To add S3 later:

1. Implement an `S3` provider that satisfies `ImageStorageProvider`.
2. Return it from `buildImageStorageProvider()` when `IMAGE_STORAGE_DRIVER=s3`.
3. Keep DB keys backend-agnostic (already in place as `storageKey`/`thumbnailKey`).
4. No domain/use-case/API contract changes required.

## Design system architecture

Global theme and visual tokens live in `app/globals.css`.

- Switch palette across all pages by changing `data-theme` on `<html>` in `app/layout.tsx`.
- Available presets:
  - `warm`
  - `classic`
- Use semantic tokens only (for example `--color-primary`, `--color-border`, `--color-surface`) instead of hardcoded page-level colors.

Shared button styles live in:

- `app/_components/ui/button-styles.ts`
- `app/_components/ui/button.tsx`

Supported variants and states:

- `primary`: default, hover, active, disabled
- `secondary`: default, hover, active, disabled
- `danger`: default, hover, active, disabled

Use `buttonClassName(\"primary\" | \"secondary\" | \"danger\")` for links and buttons to keep interactions consistent across pages.

## Auth smoke test

Run the end-to-end auth/ownership smoke checks:

```bash
./scripts/auth-smoke-test.sh
```

Run protected-page redirect guard checks:

```bash
./scripts/route-guards-smoke-test.sh
```

Run logout lifecycle checks:

```bash
./scripts/logout-smoke-test.sh
```

Optional env overrides:

```bash
BASE_URL=http://localhost:3000 ALICE_PASSWORD='Password123!' BOB_PASSWORD='Password123!' ./scripts/auth-smoke-test.sh
```

Run phased image checks:

```bash
npm run test:phase0
npm run test:phase1
npm run test:phase2
```

Run end-to-end curl smoke for image flows (auto-generates sample images if not provided):

```bash
./scripts/phase1-curl-smoke-test.sh
```

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
