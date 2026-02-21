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
prisma migrate dev
prisma db seed
```

Seeded credentials for MVP testing:

- `alice` / `Password123!`
- `bob` / `Password123!`

Set `JWT_SECRET` in `.env` before using auth endpoints.

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
