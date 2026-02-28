// Home page that lists recipes from the API.
import Link from "next/link";
import { headers } from "next/headers";
import { getOptionalAuthPageUser } from "@/lib/auth/page-auth-user";
import LogoutButton from "@/app/_components/logout-button";
import HomeCanvas from "@/app/_components/home-canvas";
import { buttonClassName } from "@/app/_components/ui/button-styles";
import RecipeCardCarousel from "@/app/_components/recipe-card-carousel";

type PrimaryImageRef = {
  id: number;
  thumbnailUrl: string;
  fullUrl: string;
};

type RecipeListItem = {
  id: number;
  title: string;
  createdAt: string;
  primaryImage?: PrimaryImageRef | null;
  images?: PrimaryImageRef[];
};

type RecipesResponse = {
  recipes: RecipeListItem[];
};

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

  const response = await fetch(`${baseUrl}/api/recipes?includePrimaryImage=true&includeImages=true`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to load recipes");
  }

  return (await response.json()) as RecipesResponse;
}

export default async function HomePage() {
  const [recipesResponse, authUser] = await Promise.all([fetchRecipes(), getOptionalAuthPageUser()]);
  const { recipes } = recipesResponse;

  return (
    <main id="home-page-main" className="relative min-h-screen overflow-hidden py-6 sm:py-10">
      <HomeCanvas />

      <div id="home-app-shell" className="app-shell space-y-6">
        <header id="home-page-header" className="surface-panel p-6 sm:p-8">
          <div id="home-header-content" className="space-y-5">
            <div id="home-hero-actions" className="flex w-full flex-wrap items-center justify-end gap-2">
              {!authUser ? (
                <>
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
                  <Link id="home-manage-account-link" href="/account/change-password" className={buttonClassName("secondary")}>
                    Manage your Account
                  </Link>
                </>
              )}

              <Link id="home-add-recipe-link" href="/recipes/new" className={buttonClassName("primary")}>
                + Add Family Recipe
              </Link>
              <Link id="home-import-recipe-link" href="/recipes/import" className={buttonClassName("secondary")}>
                Import Recipe Text
              </Link>
            </div>

            <div id="home-hero-copy" className="max-w-3xl">
              <p id="home-hero-eyebrow" className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-primary)]">Family Recipe Archive</p>
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

          <div id="home-status-pills" className="mt-5 flex flex-wrap gap-2.5">
            <span id="home-recipe-count-pill" className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)]">
              {recipes.length} Heritage Recipe{recipes.length === 1 ? "" : "s"}
            </span>
            <span id="home-auth-status-pill" className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-3 py-1 text-xs font-semibold text-[var(--color-text-muted)]">
              {authUser ? `Signed in as ${authUser.username}` : "Guest preview mode"}
            </span>
          </div>
        </header>

        <section id="home-content-section" className="grid gap-[18px] lg:grid-cols-[1.7fr_1fr]">
          {recipes.length === 0 ? (
            <article id="home-empty-state-card" className="surface-card p-10 text-center">
              <h2 id="home-empty-state-title" className="text-xl font-semibold">Start your family recipe archive</h2>
              <p id="home-empty-state-description" className="mx-auto mt-3 max-w-lg text-sm text-[var(--color-text-muted)]">
                Add your first recipe with notes about who taught it and where it came from, so your family can keep it for generations.
              </p>
            </article>
          ) : (
            <ul id="home-recipe-list" className="grid grid-cols-1 gap-[14px] sm:grid-cols-2">
              {recipes.map((recipe) => (
                <li
                  id={`home-recipe-card-${recipe.id}`}
                  key={recipe.id}
                  className="surface-card overflow-hidden p-0 transition-transform hover:-translate-y-0.5"
                >
                  {recipe.images && recipe.images.length > 0 ? (
                    <RecipeCardCarousel recipeId={recipe.id} title={recipe.title} images={recipe.images} />
                  ) : recipe.primaryImage ? (
                    <img
                      id={`home-recipe-image-${recipe.id}`}
                      src={recipe.primaryImage.thumbnailUrl}
                      alt={recipe.title}
                      className="h-36 w-full object-cover"
                    />
                  ) : null}
                  <div id={`home-recipe-content-${recipe.id}`} className="p-4">
                    <Link id={`home-recipe-link-${recipe.id}`} href={`/recipes/${recipe.id}`} className="text-lg font-semibold hover:underline">
                      {recipe.title}
                    </Link>
                    <p id={`home-recipe-added-label-${recipe.id}`} className="mt-2 text-xs uppercase tracking-wide text-[var(--color-text-muted)]">Added on</p>
                    <p id={`home-recipe-created-at-${recipe.id}`} className="text-sm text-[var(--color-text-muted)]">{new Date(recipe.createdAt).toLocaleString()}</p>
                  </div>
                </li>
              ))}
            </ul>
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
