// Home page that lists recipes from the API.
import Link from "next/link";
import Image from "next/image";
import { headers } from "next/headers";
import { getOptionalAuthPageUser } from "@/lib/auth/page-auth-user";
import LogoutButton from "@/app/_components/logout-button";
import HomeCanvas from "@/app/_components/home-canvas";
import { buttonClassName } from "@/app/_components/ui/button-styles";
import RecipeVisibilityTabs, { type RecipeVisibilityTabGroup } from "@/app/_components/recipe-visibility-tabs";

type PrimaryImageRef = {
  id: number;
  thumbnailUrl: string;
  fullUrl: string;
};

type RecipeListItem = {
  id: number;
  title: string;
  createdAt: string;
  visibility: "public" | "private" | "family";
  families: Array<{ id: number; name: string }>;
  primaryImage?: PrimaryImageRef | null;
  images?: PrimaryImageRef[];
};

type RecipesResponse = { recipes: RecipeListItem[] };

function getBaseUrl(requestHeaders: Headers) {
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";

  if (host) {
    return `${protocol}://${host}`;
  }

  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

async function fetchRecipes() {
  const requestHeaders = await headers();
  const baseUrl = getBaseUrl(requestHeaders);
  const cookie = requestHeaders.get("cookie") ?? "";

  const response = await fetch(`${baseUrl}/api/recipes?includePrimaryImage=true&includeImages=true`, {
    cache: "no-store",
    headers: cookie ? { cookie } : undefined,
  });

  if (!response.ok) {
    throw new Error("Failed to load recipes");
  }

  return (await response.json()) as RecipesResponse;
}

export default async function HomePage() {
  const [recipesResponse, authUser] = await Promise.all([fetchRecipes(), getOptionalAuthPageUser()]);
  const { recipes } = recipesResponse;
  const publicRecipes = recipes.filter((recipe) => recipe.visibility === "public");
  const visibleRecipes = authUser ? recipes : publicRecipes;
  const privateRecipes = recipes.filter((recipe) => recipe.visibility === "private");
  const familyGroupsMap = new Map<string, RecipeVisibilityTabGroup>();

  for (const recipe of recipes) {
    if (recipe.visibility !== "family") {
      continue;
    }

    if (recipe.families.length === 0) {
      const unassignedGroupId = "family-unassigned";
      const existingGroup = familyGroupsMap.get(unassignedGroupId);
      if (existingGroup) {
        existingGroup.recipes.push(recipe);
      } else {
        familyGroupsMap.set(unassignedGroupId, {
          id: unassignedGroupId,
          label: "Family: Unassigned",
          type: "family",
          recipes: [recipe],
        });
      }
      continue;
    }

    for (const family of recipe.families) {
      const familyGroupId = `family-${family.id}`;
      const existingGroup = familyGroupsMap.get(familyGroupId);
      if (existingGroup) {
        existingGroup.recipes.push(recipe);
      } else {
        familyGroupsMap.set(familyGroupId, {
          id: familyGroupId,
          label: `Family: ${family.name}`,
          type: "family",
          recipes: [recipe],
        });
      }
    }
  }

  const familyGroups = Array.from(familyGroupsMap.values()).sort((a, b) => a.label.localeCompare(b.label));
  const visibilityTabGroups: RecipeVisibilityTabGroup[] = authUser
    ? [
        { id: "public", label: "Public", type: "public", recipes: publicRecipes },
        ...familyGroups,
        { id: "private", label: "Private", type: "private", recipes: privateRecipes },
      ]
    : [];

  return (
    <main id="home-page-main" className="relative min-h-screen overflow-hidden py-6 sm:py-10">
      <HomeCanvas />

      <div id="home-app-shell" className="app-shell space-y-6">
        <header id="home-page-top-header" className="surface-panel p-4 sm:p-5">
          <div id="home-page-top-header-row" className="page-header-bar">
            <div id="home-page-top-header-brand" className="page-header-copy">
              <p id="home-page-top-header-eyebrow" className="page-eyebrow">Recetas</p>
              <p id="home-page-top-header-description" className="page-supporting-text">
                A shared archive for preserving recipes, stories, and family cooking traditions.
              </p>
            </div>

            <div id="home-page-top-header-actions" className="flex flex-wrap items-center gap-2">
              <Link id="home-top-add-recipe-link" href="/recipes/new" className={buttonClassName("primary")}>
                + Add Family Recipe
              </Link>

              {!authUser ? (
                <>
                  <span id="home-auth-status-pill" className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-3 py-1 text-xs font-semibold text-[var(--color-text-muted)]">
                    Guest preview mode
                  </span>
                  <Link id="home-create-account-link" href="/register" className={buttonClassName("secondary")}>
                    Create Account
                  </Link>
                  <Link id="home-login-link" href="/login" className={buttonClassName("secondary")}>
                    Log In
                  </Link>
                </>
              ) : (
                <>
                  <LogoutButton />
                  <span id="home-auth-status-pill" className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-3 py-1 text-xs font-semibold text-[var(--color-text-muted)]">
                    Signed in as {authUser.username}
                  </span>
                </>
              )}
            </div>
          </div>

          <div id="home-page-top-header-tabs" className="secondary-tab-strip mt-4">
            <span id="home-top-header-tab-recipes" className="secondary-tab-strip-item" data-active="true">Recipes</span>
            <Link
              id="home-top-header-tab-account"
              href={authUser ? "/account/change-password" : "/login"}
              className="secondary-tab-strip-item"
            >
              {authUser ? "Account" : "Log In"}
            </Link>
            {authUser ? (
              <Link id="home-my-families-link" href="/account/families" className="secondary-tab-strip-item">
                My Families
              </Link>
            ) : null}
            <Link id="home-top-header-tab-add-recipe" href="/recipes/new" className="secondary-tab-strip-item">
              Add Recipe
            </Link>
          </div>
        </header>

        <header id="home-page-header" className="surface-panel p-6 sm:p-8">
          <div id="home-header-content" className="space-y-5">
            <div id="home-hero-copy" className="max-w-3xl">
              <div id="home-hero-eyebrow-row" className="flex flex-wrap items-center gap-2.5">
                <p id="home-hero-eyebrow" className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-primary)]">Family Recipe Archive</p>
                <span id="home-recipe-count-pill" className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)]">
                  {visibleRecipes.length} Heritage Recipe{visibleRecipes.length === 1 ? "" : "s"}
                </span>
              </div>
              <h1
                id="home-hero-title"
                className="mt-2 text-4xl font-semibold leading-[1.05] tracking-tight sm:text-6xl"
                style={{ fontFamily: '"Iowan Old Style", "Palatino Linotype", serif' }}
              >
                Keep family recipes alive across every distance
              </h1>
              <p id="home-hero-description" className="mt-3 max-w-2xl text-base leading-relaxed text-[var(--color-text-muted)] sm:text-lg">
                A shared kitchen archive for families living in different cities and countries, so each recipe carries stories,
                notes, and tradition into the next generation.
              </p>
            </div>
          </div>
        </header>

        <section id="home-content-section" className="grid gap-[18px] lg:grid-cols-[1.7fr_1fr]">
          {visibleRecipes.length === 0 ? (
            <article id="home-empty-state-card" className="surface-card p-10 text-center">
              <h2 id="home-empty-state-title" className="text-xl font-semibold">Start your family recipe archive</h2>
              <p id="home-empty-state-description" className="mx-auto mt-3 max-w-lg text-sm text-[var(--color-text-muted)]">
                Add your first recipe with notes about who taught it and where it came from, so your family can keep it for generations.
              </p>
            </article>
          ) : authUser ? (
            <RecipeVisibilityTabs groups={visibilityTabGroups} />
          ) : (
            <article id="home-public-recipes-card" className="surface-card p-4 sm:p-5">
              <p id="home-public-recipes-label" className="mb-2 text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                Showing Public recipes ({publicRecipes.length})
              </p>
              <ul id="home-public-recipes-list" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {publicRecipes.map((recipe) => (
                  <li id={`home-public-recipes-item-${recipe.id}`} key={recipe.id} className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)]">
                    {recipe.images && recipe.images.length > 0 ? (
                      <Image
                        id={`home-public-recipes-image-gallery-first-${recipe.id}`}
                        src={recipe.images[0].thumbnailUrl}
                        alt={recipe.title}
                        width={640}
                        height={360}
                        className="block h-36 w-full object-cover"
                      />
                    ) : recipe.primaryImage ? (
                      <Image
                        id={`home-public-recipes-image-${recipe.id}`}
                        src={recipe.primaryImage.thumbnailUrl}
                        alt={recipe.title}
                        width={640}
                        height={360}
                        className="block h-36 w-full object-cover"
                      />
                    ) : null}
                    <div id={`home-public-recipes-item-content-${recipe.id}`} className="p-3">
                      <Link id={`home-public-recipes-link-${recipe.id}`} href={`/recipes/${recipe.id}`} className="text-base font-semibold hover:underline">
                        {recipe.title}
                      </Link>
                      <p id={`home-public-recipes-date-${recipe.id}`} className="mt-1 text-xs text-[var(--color-text-muted)]">
                        Added {new Date(recipe.createdAt).toLocaleDateString()}
                      </p>
                      <p id={`home-public-recipes-summary-${recipe.id}`} className="mt-1 text-xs uppercase tracking-wide text-[var(--color-primary)]">
                        Public
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </article>
          )}

          <aside id="home-preservation-aside" className="surface-card p-5">
            <h2 id="home-preservation-title" className="text-lg font-semibold">Preservation Features</h2>
            <div id="home-preservation-features" className="mt-4 space-y-3 text-sm text-[var(--color-text-muted)]">
              <article id="home-feature-story-layer" className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3">
                <h3 id="home-feature-story-layer-title" className="font-semibold text-[var(--color-text)]">Family Story Layer</h3>
                <p id="home-feature-story-layer-description" className="mt-1">Capture who taught the recipe and why it matters to your family.</p>
              </article>
              <article id="home-feature-generation-timeline" className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3">
                <h3 id="home-feature-generation-timeline-title" className="font-semibold text-[var(--color-text)]">Generation Timeline</h3>
                <p id="home-feature-generation-timeline-description" className="mt-1">Follow recipes from grandparents to children in one shared archive.</p>
              </article>
              <article id="home-feature-distance-sharing" className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3">
                <h3 id="home-feature-distance-sharing-title" className="font-semibold text-[var(--color-text)]">Distance-Friendly Sharing</h3>
                <p id="home-feature-distance-sharing-description" className="mt-1">Keep family connected around food even when everyone lives far apart.</p>
              </article>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
