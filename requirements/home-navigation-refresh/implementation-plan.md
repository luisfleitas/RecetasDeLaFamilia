# Home Navigation Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved warm cream/orange Recetas home refresh with a logged-in account menu, Option A rail/drawer navigation, Option A featured carousel placement, and grouped center recipe tabs.

**Architecture:** Keep `app/page.tsx` focused on auth-aware server data loading and passing prepared props. Put view behavior in focused client components under `app/_components/`, and put ownership filtering, family summaries, carousel selection, and route preparation in `lib/application/home-navigation/` helpers. Preserve the existing recipe visibility source of truth and existing routes.

**Tech Stack:** Next.js App Router, React client components, TypeScript, Prisma-backed application loaders, existing Recetas CSS/Tailwind utilities, existing i18n message setup.

---

## Source Documents
- `AGENTS.md`
- `requirements/home-navigation-refresh/requirements-brief.md`
- `requirements/home-navigation-refresh/branding-guidelines.md`
- `requirements/home-navigation-refresh/left-menu-options.md`
- `requirements/home-navigation-refresh/carousel-placement-options.html`
- `requirements/home-navigation-refresh/left-menu-options.html`
- `requirements/ui-workflow/ui-agents-workflow.md`

## File Responsibility Map
- Modify `app/page.tsx`: server page orchestration only; load auth user, recipes, home navigation view model, and render the new home shell.
- Modify `app/globals.css`: warm brand tokens, shell layout classes, rail/drawer styles, carousel styles, grouped tab styles, and responsive behavior.
- Modify `lib/i18n/messages.ts`: add copy for greeting, navigation labels, empty states, carousel labels, and menu actions in English and Spanish.
- Create `lib/application/home-navigation/view-model.ts`: pure helpers that prepare families, owned recipes, featured recipes, route targets, and grouped recipe tab labels.
- Create `scripts/home-navigation-view-model.test.ts`: focused tests for the helper behavior.
- Create `app/_components/home-account-menu.tsx`: client account dropdown with account-settings link and logout action.
- Create `app/_components/home-left-navigation.tsx`: client Option A compact rail and slide-out drawer with Families and Recipes sections.
- Create `app/_components/home-featured-carousel.tsx`: client featured/recent recipe preview carousel above the recipe groups.
- Modify `app/_components/recipe-visibility-tabs.tsx`: preserve behavior while restyling grouped tabs to match the approved warm rounded tab reference.
- Optional modify `app/_components/logout-button.tsx`: only if the account menu needs a reusable logout trigger that the current component cannot support cleanly.

## Task 1: Add Home Navigation View Model Helpers

**Files:**
- Create: `lib/application/home-navigation/view-model.ts`
- Create: `scripts/home-navigation-view-model.test.ts`

- [x] **Step 1: Write tests for sidebar, carousel, and route preparation**

Create `scripts/home-navigation-view-model.test.ts`:

```ts
import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFeaturedRecipeSlides,
  buildHomeNavigationViewModel,
  getRecipeGroupDisplayLabel,
} from "../lib/application/home-navigation/view-model";

const recipes = [
  {
    id: 1,
    title: "Public Arepas",
    description: "Crisp and warm.",
    createdByUserId: 7,
    createdAt: "2026-01-02T00:00:00.000Z",
    visibility: "public" as const,
    families: [],
    images: [{ id: 11, thumbnailUrl: "/public-arepas.jpg", fullUrl: "/public-arepas-large.jpg" }],
    primaryImage: null,
  },
  {
    id: 2,
    title: "Family Sancocho",
    description: null,
    createdByUserId: 7,
    createdAt: "2026-01-03T00:00:00.000Z",
    visibility: "family" as const,
    families: [{ id: 20, name: "Hernández" }],
    images: [],
    primaryImage: { id: 22, thumbnailUrl: "/sancocho.jpg", fullUrl: "/sancocho-large.jpg" },
  },
  {
    id: 3,
    title: "Private Sofrito",
    description: "Base for everything.",
    createdByUserId: 7,
    createdAt: "2026-01-04T00:00:00.000Z",
    visibility: "private" as const,
    families: [],
    images: [],
    primaryImage: null,
  },
  {
    id: 4,
    title: "Other User Recipe",
    description: null,
    createdByUserId: 8,
    createdAt: "2026-01-05T00:00:00.000Z",
    visibility: "public" as const,
    families: [],
    images: [],
    primaryImage: null,
  },
];

const families = [
  { id: 20, name: "Hernández", role: "admin", joinedAt: "2026-01-01T00:00:00.000Z" },
  { id: 21, name: "Abuela Rosa", role: "member", joinedAt: "2026-01-02T00:00:00.000Z" },
];

test("limits sidebar families and owned recipes to six and prepares approved routes", () => {
  const model = buildHomeNavigationViewModel({
    userId: 7,
    recipes,
    families,
  });

  assert.deepEqual(model.families, [
    { id: 20, name: "Hernández", editHref: "/account/families" },
    { id: 21, name: "Abuela Rosa", editHref: "/account/families" },
  ]);
  assert.equal(model.familyCreateHref, "/account/families");
  assert.equal(model.familiesMoreHref, "/account/families");
  assert.deepEqual(model.recipes, [
    { id: 3, title: "Private Sofrito", href: "/recipes/3", editHref: "/recipes/3/edit" },
    { id: 2, title: "Family Sancocho", href: "/recipes/2", editHref: "/recipes/2/edit" },
    { id: 1, title: "Public Arepas", href: "/recipes/1", editHref: "/recipes/1/edit" },
  ]);
  assert.equal(model.recipeCreateHref, "/recipes/new");
  assert.equal(model.recipesMoreHref, "#home-recipe-groups");
});

test("builds featured slides from most recent visible recipes", () => {
  const slides = buildFeaturedRecipeSlides(recipes, 3);

  assert.deepEqual(slides, [
    {
      id: 4,
      title: "Other User Recipe",
      description: null,
      href: "/recipes/4",
      imageUrl: null,
    },
    {
      id: 3,
      title: "Private Sofrito",
      description: "Base for everything.",
      href: "/recipes/3",
      imageUrl: null,
    },
    {
      id: 2,
      title: "Family Sancocho",
      description: null,
      href: "/recipes/2",
      imageUrl: "/sancocho.jpg",
    },
  ]);
});

test("returns approved display labels for recipe groups", () => {
  assert.equal(getRecipeGroupDisplayLabel({ type: "public", label: "Public", recipes: [] }), "Public recipes");
  assert.equal(getRecipeGroupDisplayLabel({ type: "family", label: "Family: Hernández", recipes: [] }), "Hernández");
  assert.equal(getRecipeGroupDisplayLabel({ type: "private", label: "Private", recipes: [] }), "Just for me");
});
```

- [x] **Step 2: Run the focused test and confirm it fails**

Run: `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/home-navigation-view-model.test.ts`

Expected: FAIL because `lib/application/home-navigation/view-model.ts` does not exist.

- [x] **Step 3: Implement pure view-model helpers**

Create `lib/application/home-navigation/view-model.ts`:

```ts
type RecipeImageRef = {
  id: number;
  thumbnailUrl: string;
  fullUrl: string;
};

export type HomeNavigationRecipe = {
  id: number;
  title: string;
  description?: string | null;
  createdByUserId: number;
  createdAt: string;
  visibility: "public" | "family" | "private";
  families: Array<{ id: number; name: string }>;
  primaryImage?: RecipeImageRef | null;
  images?: RecipeImageRef[];
};

export type HomeNavigationFamily = {
  id: number;
  name: string;
  role?: string;
  joinedAt?: string;
};

export type HomeSidebarFamily = {
  id: number;
  name: string;
  editHref: string;
};

export type HomeSidebarRecipe = {
  id: number;
  title: string;
  href: string;
  editHref: string;
};

export type FeaturedRecipeSlide = {
  id: number;
  title: string;
  description: string | null;
  href: string;
  imageUrl: string | null;
};

export type HomeNavigationViewModel = {
  families: HomeSidebarFamily[];
  recipes: HomeSidebarRecipe[];
  familyCreateHref: string;
  recipeCreateHref: string;
  familiesMoreHref: string;
  recipesMoreHref: string;
};

export type RecipeGroupForDisplay = {
  type: "public" | "family" | "private";
  label: string;
  recipes: unknown[];
};

export function buildHomeNavigationViewModel(input: {
  userId: number;
  recipes: HomeNavigationRecipe[];
  families: HomeNavigationFamily[];
}): HomeNavigationViewModel {
  const ownedRecipes = input.recipes
    .filter((recipe) => recipe.createdByUserId === input.userId)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 6)
    .map((recipe) => ({
      id: recipe.id,
      title: recipe.title,
      href: `/recipes/${recipe.id}`,
      editHref: `/recipes/${recipe.id}/edit`,
    }));

  return {
    families: input.families.slice(0, 6).map((family) => ({
      id: family.id,
      name: family.name,
      editHref: "/account/families",
    })),
    recipes: ownedRecipes,
    familyCreateHref: "/account/families",
    recipeCreateHref: "/recipes/new",
    familiesMoreHref: "/account/families",
    recipesMoreHref: "#home-recipe-groups",
  };
}

export function buildFeaturedRecipeSlides(recipes: HomeNavigationRecipe[], limit = 6): FeaturedRecipeSlide[] {
  return [...recipes]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, limit)
    .map((recipe) => {
      const firstImage = recipe.images?.[0] ?? recipe.primaryImage ?? null;
      return {
        id: recipe.id,
        title: recipe.title,
        description: recipe.description ?? null,
        href: `/recipes/${recipe.id}`,
        imageUrl: firstImage?.thumbnailUrl ?? null,
      };
    });
}

export function getRecipeGroupDisplayLabel(group: RecipeGroupForDisplay) {
  if (group.type === "public") {
    return "Public recipes";
  }

  if (group.type === "private") {
    return "Just for me";
  }

  return group.label.replace(/^Family:\s*/i, "");
}
```

- [x] **Step 4: Run helper tests**

Run: `node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/home-navigation-view-model.test.ts`

Expected: PASS.

## Task 2: Add Warm Brand Tokens And Layout Utilities

**Files:**
- Modify: `app/globals.css`

- [x] **Step 1: Add warm brand tokens**

In `app/globals.css`, extend `:root` with:

```css
  --brand-cream-50: #fff9ef;
  --brand-cream-100: #f8ecd8;
  --brand-cream-200: #efd8b9;
  --brand-orange-300: #e8a35e;
  --brand-orange-500: #c9682b;
  --brand-orange-700: #8e3f1c;
  --brand-brown-900: #342116;
  --brand-brown-700: #6a4a34;
  --brand-sage-500: #5b7a52;
  --brand-line-warm: rgba(142, 63, 28, 0.18);
  --brand-shadow-panel: 0 18px 42px rgba(104, 61, 27, 0.14);
  --brand-shadow-card: 0 10px 24px rgba(104, 61, 27, 0.1);
```

- [x] **Step 2: Add layout and component CSS classes**

Add classes for the new shell:

```css
.home-refresh-shell {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 1rem;
}

.home-refresh-body {
  display: grid;
  grid-template-columns: 3.5rem minmax(0, 1fr);
  gap: 1rem;
  align-items: start;
}

.home-refresh-main {
  display: grid;
  gap: 1rem;
  min-width: 0;
}

.home-warm-panel {
  border: 1px solid var(--brand-line-warm);
  border-radius: 1rem;
  background: rgba(255, 249, 239, 0.9);
  box-shadow: var(--brand-shadow-card);
}

@media (max-width: 720px) {
  .home-refresh-body {
    grid-template-columns: 1fr;
  }
}
```

- [x] **Step 3: Run style/build verification**

Run: `npm run build`

Expected: PASS or only known environment warnings unrelated to CSS.

## Task 3: Add Account Dropdown Component

**Files:**
- Create: `app/_components/home-account-menu.tsx`

- [x] **Step 1: Create client account menu**

Create `app/_components/home-account-menu.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";
import LogoutButton from "@/app/_components/logout-button";

type HomeAccountMenuProps = {
  username: string;
  accountSettingsLabel: string;
  logOutLabel: string;
};

export default function HomeAccountMenu({ username, accountSettingsLabel, logOutLabel }: HomeAccountMenuProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div id="home-account-menu" className="relative">
      <button
        id="home-account-menu-trigger"
        type="button"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-controls="home-account-menu-list"
        onClick={() => setIsOpen((current) => !current)}
        className="rounded-full border border-[var(--brand-line-warm)] bg-[var(--brand-cream-100)] px-3 py-2 text-sm font-bold text-[var(--brand-orange-700)] shadow-sm"
      >
        {username}
      </button>

      {isOpen ? (
        <div
          id="home-account-menu-list"
          role="menu"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-30 grid min-w-48 gap-1 rounded-xl border border-[var(--brand-line-warm)] bg-[var(--brand-cream-50)] p-2 shadow-[var(--brand-shadow-panel)]"
        >
          <Link
            id="home-account-menu-settings-link"
            role="menuitem"
            href="/account/change-password"
            className="rounded-lg px-3 py-2 text-sm font-semibold text-[var(--brand-brown-900)] hover:bg-[var(--brand-cream-100)]"
            onClick={() => setIsOpen(false)}
          >
            {accountSettingsLabel}
          </Link>
          <div id="home-account-menu-logout" role="menuitem" className="rounded-lg px-1 py-1">
            <LogoutButton label={logOutLabel} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
```

- [x] **Step 2: If `LogoutButton` does not accept `label`, update it**

Modify `app/_components/logout-button.tsx` only if needed so it accepts:

```tsx
type LogoutButtonProps = {
  label?: string;
};
```

Use the passed label when present and preserve the current default behavior.

- [x] **Step 3: Run TypeScript/build check**

Run: `npm run build`

Expected: PASS.

## Task 4: Add Left Rail And Drawer Component

**Files:**
- Create: `app/_components/home-left-navigation.tsx`

- [x] **Step 1: Create the Option A client component**

Create `app/_components/home-left-navigation.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";

type SidebarFamily = {
  id: number;
  name: string;
  editHref: string;
};

type SidebarRecipe = {
  id: number;
  title: string;
  href: string;
  editHref: string;
};

type HomeLeftNavigationProps = {
  families: SidebarFamily[];
  recipes: SidebarRecipe[];
  familyCreateHref: string;
  recipeCreateHref: string;
  familiesMoreHref: string;
  recipesMoreHref: string;
  labels: {
    families: string;
    recipes: string;
    addFamily: string;
    addRecipe: string;
    edit: string;
    more: string;
    expandNavigation: string;
    collapseNavigation: string;
    noFamilies: string;
    noOwnedRecipes: string;
  };
};

export default function HomeLeftNavigation({
  families,
  recipes,
  familyCreateHref,
  recipeCreateHref,
  familiesMoreHref,
  recipesMoreHref,
  labels,
}: HomeLeftNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [familiesOpen, setFamiliesOpen] = useState(true);

  return (
    <aside id="home-left-navigation" className="relative hidden lg:block">
      <nav id="home-left-navigation-rail" aria-label="Home shortcuts" className="grid justify-items-center gap-3 rounded-2xl border border-[var(--brand-line-warm)] bg-[var(--brand-cream-100)] p-2 shadow-[var(--brand-shadow-card)]">
        <button
          id="home-left-navigation-toggle-btn"
          type="button"
          aria-expanded={isOpen}
          aria-controls="home-left-navigation-drawer"
          aria-label={isOpen ? labels.collapseNavigation : labels.expandNavigation}
          onClick={() => setIsOpen((current) => !current)}
          className="grid h-10 w-10 place-items-center rounded-full bg-[var(--brand-orange-500)] text-lg font-black text-[var(--brand-cream-50)]"
        >
          {isOpen ? "‹" : "☰"}
        </button>
        <Link id="home-left-navigation-family-create-rail-link" href={familyCreateHref} aria-label={labels.addFamily} className="grid h-9 w-9 place-items-center rounded-full border border-[var(--brand-line-warm)] bg-[var(--brand-cream-50)] font-black text-[var(--brand-orange-700)]">
          +
        </Link>
        <Link id="home-left-navigation-recipe-create-rail-link" href={recipeCreateHref} aria-label={labels.addRecipe} className="grid h-9 w-9 place-items-center rounded-full border border-[var(--brand-line-warm)] bg-[var(--brand-cream-50)] font-black text-[var(--brand-orange-700)]">
          +
        </Link>
      </nav>

      {isOpen ? (
        <div id="home-left-navigation-drawer" className="absolute left-14 top-0 z-20 w-64 rounded-2xl border border-[var(--brand-line-warm)] bg-[var(--brand-cream-100)] p-4 shadow-[var(--brand-shadow-panel)]">
          <section id="home-left-navigation-families-section" className="space-y-3">
            <div id="home-left-navigation-families-header" className="flex items-center justify-between gap-2">
              <button
                id="home-left-navigation-families-toggle-btn"
                type="button"
                aria-expanded={familiesOpen}
                aria-controls="home-left-navigation-families-list"
                onClick={() => setFamiliesOpen((current) => !current)}
                className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-[var(--brand-orange-700)]"
              >
                <span aria-hidden="true">‹</span>
                {labels.families}
              </button>
              <Link id="home-left-navigation-family-create-link" href={familyCreateHref} aria-label={labels.addFamily} className="grid h-7 w-7 place-items-center rounded-full bg-[var(--brand-orange-500)] font-black text-[var(--brand-cream-50)]">
                +
              </Link>
            </div>
            {familiesOpen ? (
              <div id="home-left-navigation-families-list" className="grid gap-2">
                {families.length === 0 ? (
                  <p id="home-left-navigation-families-empty" className="text-sm text-[var(--brand-brown-700)]">{labels.noFamilies}</p>
                ) : families.map((family) => (
                  <div id={`home-left-navigation-family-item-${family.id}`} key={family.id} className="rounded-xl border border-[var(--brand-line-warm)] bg-[var(--brand-cream-50)] p-2">
                    <p id={`home-left-navigation-family-name-${family.id}`} className="truncate text-sm font-bold">{family.name}</p>
                    <Link id={`home-left-navigation-family-edit-link-${family.id}`} href={family.editHref} className="text-xs font-bold text-[var(--brand-orange-700)]">{labels.edit}</Link>
                  </div>
                ))}
                <Link id="home-left-navigation-families-more-link" href={familiesMoreHref} className="text-xs font-black text-[var(--brand-sage-500)]">{labels.more}</Link>
              </div>
            ) : null}
          </section>

          <section id="home-left-navigation-recipes-section" className="mt-5 space-y-3">
            <div id="home-left-navigation-recipes-header" className="flex items-center justify-between gap-2">
              <h2 id="home-left-navigation-recipes-title" className="text-xs font-black uppercase tracking-wide text-[var(--brand-orange-700)]">{labels.recipes}</h2>
              <Link id="home-left-navigation-recipe-create-link" href={recipeCreateHref} aria-label={labels.addRecipe} className="grid h-7 w-7 place-items-center rounded-full bg-[var(--brand-orange-500)] font-black text-[var(--brand-cream-50)]">
                +
              </Link>
            </div>
            <div id="home-left-navigation-recipes-list" className="grid gap-2">
              {recipes.length === 0 ? (
                <p id="home-left-navigation-recipes-empty" className="text-sm text-[var(--brand-brown-700)]">{labels.noOwnedRecipes}</p>
              ) : recipes.map((recipe) => (
                <div id={`home-left-navigation-recipe-item-${recipe.id}`} key={recipe.id} className="rounded-xl border border-[var(--brand-line-warm)] bg-[var(--brand-cream-50)] p-2">
                  <Link id={`home-left-navigation-recipe-link-${recipe.id}`} href={recipe.href} className="block truncate text-sm font-bold">{recipe.title}</Link>
                  <Link id={`home-left-navigation-recipe-edit-link-${recipe.id}`} href={recipe.editHref} className="text-xs font-bold text-[var(--brand-orange-700)]">{labels.edit}</Link>
                </div>
              ))}
              <Link id="home-left-navigation-recipes-more-link" href={recipesMoreHref} className="text-xs font-black text-[var(--brand-sage-500)]">{labels.more}</Link>
            </div>
          </section>
        </div>
      ) : null}
    </aside>
  );
}
```

- [x] **Step 2: Run build check**

Run: `npm run build`

Expected: PASS.

## Task 5: Add Featured Carousel Component

**Files:**
- Create: `app/_components/home-featured-carousel.tsx`

- [x] **Step 1: Create the featured carousel**

Create `app/_components/home-featured-carousel.tsx`:

```tsx
"use client";

import Link from "next/link";
import { useState } from "react";

type FeaturedSlide = {
  id: number;
  title: string;
  description: string | null;
  href: string;
  imageUrl: string | null;
};

type HomeFeaturedCarouselProps = {
  slides: FeaturedSlide[];
  labels: {
    title: string;
    previous: string;
    next: string;
  };
};

export default function HomeFeaturedCarousel({ slides, labels }: HomeFeaturedCarouselProps) {
  const [index, setIndex] = useState(0);

  if (slides.length === 0) {
    return null;
  }

  const active = slides[index] ?? slides[0];

  function previousSlide() {
    setIndex((current) => (current === 0 ? slides.length - 1 : current - 1));
  }

  function nextSlide() {
    setIndex((current) => (current + 1) % slides.length);
  }

  return (
    <section id="home-featured-carousel" className="home-warm-panel overflow-hidden">
      <div id="home-featured-carousel-media" className="relative min-h-64 bg-[var(--brand-cream-200)] sm:min-h-80">
        {active.imageUrl ? (
          <img id={`home-featured-carousel-image-${active.id}`} src={active.imageUrl} alt={active.title} className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div id={`home-featured-carousel-placeholder-${active.id}`} className="absolute inset-0 grid place-items-center bg-[linear-gradient(135deg,var(--brand-cream-100),var(--brand-orange-300))] p-8 text-center">
            <p className="font-serif text-3xl font-semibold text-[var(--brand-brown-900)]">{active.title}</p>
          </div>
        )}
        <div id="home-featured-carousel-copy" className="absolute inset-x-4 bottom-4 rounded-2xl bg-[rgba(255,249,239,0.92)] p-4 shadow-[var(--brand-shadow-card)]">
          <p id="home-featured-carousel-label" className="text-xs font-black uppercase tracking-wide text-[var(--brand-orange-700)]">{labels.title}</p>
          <Link id={`home-featured-carousel-link-${active.id}`} href={active.href} className="mt-1 block font-serif text-2xl font-semibold text-[var(--brand-brown-900)]">
            {active.title}
          </Link>
          {active.description ? (
            <p id={`home-featured-carousel-description-${active.id}`} className="mt-1 text-sm text-[var(--brand-brown-700)]">{active.description}</p>
          ) : null}
        </div>
      </div>
      <div id="home-featured-carousel-controls" className="flex items-center justify-between gap-3 border-t border-[var(--brand-line-warm)] bg-[var(--brand-cream-50)] px-4 py-3">
        <p id="home-featured-carousel-counter" className="text-sm font-bold text-[var(--brand-brown-700)]">{index + 1}/{slides.length}</p>
        <div className="flex gap-2">
          <button id="home-featured-carousel-prev-btn" type="button" aria-label={labels.previous} onClick={previousSlide} className="grid h-9 w-9 place-items-center rounded-full border border-[var(--brand-line-warm)] bg-[var(--brand-cream-100)] font-black text-[var(--brand-orange-700)]">‹</button>
          <button id="home-featured-carousel-next-btn" type="button" aria-label={labels.next} onClick={nextSlide} className="grid h-9 w-9 place-items-center rounded-full border border-[var(--brand-line-warm)] bg-[var(--brand-cream-100)] font-black text-[var(--brand-orange-700)]">›</button>
        </div>
      </div>
    </section>
  );
}
```

- [x] **Step 2: Run build check**

Run: `npm run build`

Expected: PASS.

## Task 6: Restyle Grouped Recipe Tabs And Greeting

**Files:**
- Modify: `app/_components/recipe-visibility-tabs.tsx`
- Modify: `lib/i18n/messages.ts`

- [x] **Step 1: Add i18n messages**

Add English and Spanish message keys under `home`:

```ts
homeGreeting: "Hello {username} what should we cook today?",
featuredRecipes: "Featured recipes",
previousFeaturedRecipe: "Previous featured recipe",
nextFeaturedRecipe: "Next featured recipe",
publicRecipesTab: "Public recipes",
privateRecipesTab: "Just for me",
```

Spanish:

```ts
homeGreeting: "Hola {username}, ¿qué cocinamos hoy?",
featuredRecipes: "Recetas destacadas",
previousFeaturedRecipe: "Receta destacada anterior",
nextFeaturedRecipe: "Siguiente receta destacada",
publicRecipesTab: "Recetas públicas",
privateRecipesTab: "Solo para mí",
```

- [x] **Step 2: Update tab styling**

In `app/_components/recipe-visibility-tabs.tsx`, preserve keyboard behavior and recipe rendering, but update the tab list class to a rounded warm strip:

```tsx
className="sticky top-2 z-10 flex gap-2 overflow-x-auto rounded-2xl border border-[var(--brand-line-warm)] bg-[rgba(255,249,239,0.9)] p-2 shadow-[var(--brand-shadow-card)]"
```

Update active tab class to:

```tsx
"bg-[linear-gradient(135deg,var(--brand-orange-700),var(--brand-orange-300))] text-[var(--brand-cream-50)] shadow-sm"
```

Update inactive tab class to:

```tsx
"text-[var(--brand-brown-700)] hover:-translate-y-0.5 hover:bg-[var(--brand-cream-100)] hover:text-[var(--brand-brown-900)]"
```

- [x] **Step 3: Ensure tab labels use approved display labels**

Pass already-prepared labels from `app/page.tsx`, or call `getRecipeGroupDisplayLabel` before rendering groups so visible labels become `Public recipes`, each family name, and `Just for me`.

- [x] **Step 4: Run build check**

Run: `npm run build`

Expected: PASS.

## Task 7: Wire The Home Page Shell

**Files:**
- Modify: `app/page.tsx` to remove `home-hero-section` and `home-preservation-aside`, then flow directly into the app workspace.
- Create or modify helper import use from `lib/application/home-navigation/view-model.ts`

- [x] **Step 1: Load families server-side for logged-in users**

Use `getPrisma()` in `app/page.tsx` or extract a focused loader in `lib/application/home-navigation/view-model.ts` so the page can prepare:

```ts
const memberships = authUser
  ? await prisma.familyMembership.findMany({
      where: { userId: authUser.user_id },
      include: { family: true },
      orderBy: { joinedAt: "desc" },
    })
  : [];
```

Map to `{ id, name, role, joinedAt }`.

- [x] **Step 2: Build prepared props**

After loading recipes and families, call:

```ts
const homeNavigation = authUser
  ? buildHomeNavigationViewModel({
      userId: authUser.user_id,
      recipes: visibleRecipes,
      families: familyMemberships,
    })
  : null;

const featuredSlides = buildFeaturedRecipeSlides(visibleRecipes, 6);
```

- [x] **Step 3: Render the warm shell**

Render:
- top bar with `HomeAccountMenu` when logged in
- `Create Account` link when logged out
- `HomeLeftNavigation` only when logged in
- greeting text `Hello {username} what should we cook today?` above carousel for logged-in users
- `HomeFeaturedCarousel` above grouped recipes
- existing `RecipeVisibilityTabs`/public recipe list below

- [x] **Step 4: Preserve logged-out behavior**

For logged-out users:
- no `HomeLeftNavigation`
- top bar shows `Create Account`
- visible recipes remain `publicRecipes`
- carousel uses only public recipes
- public recipe cards remain visible

- [x] **Step 5: Run build check**

Run: `npm run build`

Expected: PASS.

## Task 8: Responsive And Accessibility Verification

**Files:**
- Modify only files required by findings from verification.

- [x] **Step 1: Start local app**

Run: `npm run dev`

Expected: dev server starts and prints a localhost URL.

- [x] **Step 2: Verify logged-out home**

Open `/` in browser.

Expected:
- no left rail/drawer
- `Create Account` is visible in top bar
- only public recipes display
- featured carousel, if present, uses public recipes only
- no overlapping text at mobile width

- [x] **Step 3: Verify logged-in home**

Log in with a seeded user or use the project’s existing auth smoke flow.

Expected:
- user name is visible on the top right
- account dropdown opens and contains Edit Account Settings and Log Out
- left rail is visible
- drawer opens and closes
- Families section has `‹ Families` and a `+` button
- Recipes section has a `+` button
- grouped tabs show Public recipes, each family, and Just for me with counts
- greeting says `Hello {user Name} what should we cook today?`

Verified with the seeded `alice` account on `http://127.0.0.1:3000/`. A responsive follow-up patch was applied so the compact rail remains available below the desktop breakpoint and the drawer overlays the page on mobile-sized viewports instead of disappearing.

- [x] **Step 4: Run automated checks**

Run:

```bash
npm run build
node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/home-navigation-view-model.test.ts
```

Expected: both pass.

## Task 9: Update Handoff And QA Checklist

**Files:**
- Modify: `requirements/home-navigation-refresh/handoff.md`
- Modify: `requirements/home-navigation-refresh/qa-checklist.md`

- [x] **Step 1: Record completed implementation and verification**

Update the handoff with:
- current branch
- files changed
- tests/build run
- manual browser checks completed
- next action

- [x] **Step 2: Mark QA checklist items**

Mark only verified items as complete. Leave manual items unchecked until performed.

## Task 10: Remove Deprecated Home Header, Refresh Top Header, And Clean Old Green Banners Before Final QA

**Files:**
- Modify `app/page.tsx` to remove the deprecated `home-page-header` wrapper from the refreshed home shell.
- Modify `app/page.tsx` and `app/globals.css` as needed so `home-page-top-header` uses the new approved home-navigation design instead of the old page-header/surface-panel treatment.
- Modify only affected UI files after visual review identifies the remaining old green banner/status treatments.
- Likely touched areas: home page status surfaces, account/auth success messages, family invite/family dashboard messages, and any banner-like recipe workflow messages that still read as the previous green system.

- [x] **Step 1: Remove the deprecated `home-page-header` wrapper and refresh `home-page-top-header`**

Remove `id="home-page-header"` from the refreshed home page structure and keep the hero/greeting/carousel/recipe-group layout aligned with the approved warm home-navigation direction.
Update `id="home-page-top-header"` so it matches the new design system: warm utility-focused header, clearer account/language/add-recipe actions, and no old `surface-panel`/generic page-header feel.

Expected:
- `app/page.tsx` no longer renders `home-page-header`
- `home-page-top-header` remains as the home shell top utility area but uses the refreshed warm design treatment
- `home-page-top-header` no longer looks like the previous generic page header or a leftover banner/card
- removing the wrapper does not reintroduce card-on-card layout, text overlap, or lost spacing around the hero and carousel
- the home page keeps stable ids for the remaining visible UI sections

- [x] **Step 2: Audit remaining green banner/status treatments**

Search the app for green/sage/primary success treatments and inspect rendered surfaces that appear as old green banners or status notices.

Expected:
- intentional sage support accents are allowed only where they behave as low-emphasis secondary/family cues
- banner-like success/status surfaces should move to the approved warm cream/orange system unless the banner is a warning/error state with a separate semantic color

- [x] **Step 3: Patch old green banners/status surfaces**

Replace outdated green banner/status styling with the approved warm brand tokens from `requirements/home-navigation-refresh/branding-guidelines.md`.

Expected:
- no old green banner remains on touched home-navigation flows
- success/status messaging keeps accessible contrast and does not rely on color alone
- warning/error banners keep semantic warning/error treatment

- [x] **Step 4: Verify after cleanup**

Run:

```bash
npm run build
node --experimental-strip-types --loader ./scripts/alias-loader.mjs --test scripts/home-navigation-view-model.test.ts
```

Expected: both pass.

## Task 11: Reopen Visual Readiness Against The Original Source Wireframe

**Status:** Newly added after the current app was compared against `https://bliss-coach-78479963.figma.site/` and found not ready.

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/globals.css`
- Modify: `app/_components/home-left-navigation.tsx`
- Modify: `app/_components/home-featured-carousel.tsx`
- Modify: `app/_components/recipe-visibility-tabs.tsx`
- Modify: `app/_components/home-canvas.tsx` or remove it from the home page if the decorative background is no longer appropriate.
- Modify: `requirements/home-navigation-refresh/branding-guidelines.md`
- Modify: `requirements/home-navigation-refresh/qa-checklist.md`
- Modify: `requirements/home-navigation-refresh/handoff.md`

- [x] **Step 1: Remove `home-hero-section` and return the first viewport to an app shell**

Compare the current local app against the source wireframe. Rework the top of the logged-in landing so recipe scanning and navigation are the primary first-viewport task.

Expected:
- `home-hero-section` is removed from the refreshed landing
- `home-preservation-aside` is removed from the refreshed landing
- the page no longer opens with an oversized marketing headline as the dominant element
- the compact shell/header flows directly into the greeting, carousel, and grouped recipe workspace
- the logged-in greeting says `Hello {user Name} what should we cook today?`
- the logged-out greeting says `Hello what should we cook today?`
- the top utility/header area is compact and only shows the signed-in person's name control with submenu actions for logout and password/account settings
- the language changer button remains always visible for both logged-in and logged-out users
- for logged-in users, the language changer sits next to the signed-in person's name/menu button
- extra top-level actions or secondary navigation are removed from the signed-in top bar unless they are part of the approved source wireframe
- the greeting, carousel, and grouped recipe tabs move closer to the first viewport
- the app shell uses a larger portion of the available screen width, closer to the source/preview shell
- the result still preserves the approved warm cream/orange visual direction

- [x] **Step 2: Re-anchor the logged-in left navigation**

Adjust the Option A rail/drawer so it reads as part of the app shell instead of a floating overlay competing with hero copy.

Expected:
- collapsed state feels like a left navigation rail, not only an isolated floating button
- opened drawer aligns with the main workspace and does not obscure oversized hero content
- expanded left navigation includes a hide/collapse button directly to the left of the `Families` heading
- mobile can still use overlay behavior where needed
- families and owned recipes remain capped at six and keep approved routes

- [x] **Step 3: Tighten the featured carousel into a featured band**

Rework the carousel sizing and copy treatment so it is prominent but does not behave like the page hero.

Expected:
- carousel remains above grouped recipe tabs
- image/placeholder height is compact enough to keep recipe groups visible sooner
- recipe title, optional description, counter, and controls remain readable and accessible
- no empty carousel shell renders when no slides exist

- [x] **Step 4: Refresh `home-visibility-tabs` / recipe visibility tabs**

Review the grouped recipe tabs against the source/preview shell and update the visual treatment so they feel like part of the app workspace.

Expected:
- `home-visibility-tabs` / recipe visibility tabs use the approved app-workspace treatment
- public, family, and private group labels and counts remain visible
- the Showing recipes panel displays a fuller set of recipe cards, not only a sparse preview
- recipe cards use responsive columns so the number of cards per row adjusts to available screen width
- keyboard behavior for ArrowLeft, ArrowRight, Home, and End remains intact
- tab overflow remains usable on mobile and narrow widths

- [x] **Step 5: Update the background color and remove or tame decorative effects**

Review the page background color plus the animated canvas/radial treatment against the Recetas UI rules and source wireframe. Keep only background treatment that supports a practical app shell.

Expected:
- no decorative background competes with navigation or recipe content
- the page background no longer reads green overall
- background color and ambient treatment align with the approved warm cream/orange direction
- page background still feels warm and intentional
- reduced-motion behavior remains respected if any motion stays

- [x] **Step 6: Update reusable branding guidelines for future pages**

Revise `requirements/home-navigation-refresh/branding-guidelines.md` so the corrected warm cream/orange app-shell direction can be reused on subsequent Recetas pages.

Expected:
- guidelines explicitly document approved background colors and when not to use green/sage as the page background
- guidelines document compact app-shell layout principles, including wider page usage and avoiding hero-led layouts for task pages
- guidelines document top-bar behavior: signed-in person name control with submenu for logout and password/account settings, plus an always-visible language changer placed next to that name control when logged in
- guidelines document reusable treatments for left navigation, featured bands, recipe visibility tabs, responsive recipe-card grids, status surfaces, and future page sections
- guidance is concrete enough for later pages to follow without re-opening this design discussion

- [x] **Step 7: Compare the implemented home page against the completed mockup**

Use `requirements/home-navigation-refresh/completed-home-page-mockup.html` as the visual target for the final home page pass.

Expected:
- implemented top bar matches the mockup structure: brand on the left, always-visible language changer next to the signed-in name/menu on the right
- implemented page removes `home-hero-section` and `home-preservation-aside`
- implemented page uses the warm cream/orange background and wider app-shell layout from the mockup
- implemented left navigation, including the hide button to the left of `Families`, featured band, visibility tabs, and responsive recipe-card grid visually match the mockup direction
- any intentional differences from the mockup are documented in the handoff before final approval

- [x] **Step 8: Re-run visual and functional verification**

Run the focused tests/build, then perform browser review against both the source wireframe and local app.

Expected:
- direct visual comparison shows the local landing follows the source shell structure and the completed mockup while retaining approved warm styling
- logged-in and logged-out flows still pass
- mobile and desktop screenshots show no overlap or horizontal overflow
- branding guidelines, QA checklist, and handoff reflect the new state accurately

Completed verification notes:
- Clean unauthenticated in-app browser review on `http://localhost:3105/` confirmed `Create Account`, login access, `#home-app-frame`, `#home-featured-carousel`, and `#home-recipe-groups` render while logged-in left navigation, `#home-hero-section`, and `#home-preservation-aside` do not render.
- Side-by-side visual pass compared the sparse original source wireframe at `https://bliss-coach-78479963.figma.site/`, the approved completed mockup at `requirements/home-navigation-refresh/completed-home-page-mockup.html`, and the local implementation. The source remains a minimal shell reference; the local implementation follows the completed warm app-shell mockup direction while preserving real Recetas data and logged-out affordances.
- 390x844 Playwright review confirmed no document-level horizontal overflow, no duplicate rendered `id` attributes, and stable ordering from greeting to featured carousel to grouped recipe workspace.
- Final cleanup passed: duplicate-id check, focused home navigation view-model test, `git diff --check`, and `npm run build`.

## Plan Self-Review
- Spec coverage: covers top bar, account dropdown, Option A left rail/drawer, family/recipe plus buttons, Option A carousel, center tabs/greeting, logged-out behavior, `home-page-header` removal, `home-page-top-header` redesign, old green banner/status cleanup, separation of concerns, i18n, mobile, accessibility, and verification.
- Placeholder scan: no implementation step should contain unresolved placeholders.
- Type consistency: view-model types are reused by page and components; route decisions match the requirements brief.
