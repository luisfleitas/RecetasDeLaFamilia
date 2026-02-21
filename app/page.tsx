// Home page that lists recipes from the API.
import Link from "next/link";
import { headers } from "next/headers";
import { getOptionalAuthPageUser } from "@/lib/auth/page-auth-user";
import LogoutButton from "@/app/_components/logout-button";
import HomeCanvas from "@/app/_components/home-canvas";
import { buttonClassName } from "@/app/_components/ui/button-styles";

type RecipeListItem = {
  id: number;
  title: string;
  createdAt: string;
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

  const response = await fetch(`${baseUrl}/api/recipes`, {
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
    <main className="relative min-h-screen overflow-hidden py-6 sm:py-10">
      <HomeCanvas />

      <div id="home-app-shell" className="app-shell space-y-6 sm:space-y-8">
        <header className="surface-panel p-6 sm:p-8">
          <div id="home-header-content" className="space-y-5">
            <div id="home-hero-actions" className="flex w-full flex-wrap items-center justify-end gap-2">
              {!authUser ? (
                <>
                  <Link href="/register" className={buttonClassName("secondary")}>
                    Invite Family
                  </Link>
                  <Link href="/login" className={buttonClassName("secondary")}>
                    Family Log In
                  </Link>
                </>
              ) : (
                <LogoutButton />
              )}

              <Link href="/account/change-password" className={buttonClassName("secondary")}>
                Manage Family Access
              </Link>

              <Link href="/recipes/new" className={buttonClassName("primary")}>
                + Add Family Recipe
              </Link>
            </div>

            <div id="home-hero-copy" className="max-w-3xl">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--color-primary)]">Family Recipe Archive</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-5xl">
                Keep family recipes alive across every distance
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-[var(--color-text-muted)] sm:text-lg">
                A shared kitchen archive for families living in different cities and countries, so each recipe carries stories,
                notes, and tradition into the next generation.
              </p>
            </div>

          </div>

          <div id="home-status-pills" className="mt-5 flex flex-wrap gap-2">
            <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)]">
              {recipes.length} Heritage Recipe{recipes.length === 1 ? "" : "s"}
            </span>
            <span className="rounded-full border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-3 py-1 text-xs font-semibold text-[var(--color-text-muted)]">
              {authUser ? `Signed in as ${authUser.username}` : "Guest preview mode"}
            </span>
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[1.7fr_1fr]">
          {recipes.length === 0 ? (
            <article className="surface-card p-10 text-center">
              <h2 className="text-xl font-semibold">Start your family recipe archive</h2>
              <p className="mx-auto mt-3 max-w-lg text-sm text-[var(--color-text-muted)]">
                Add your first recipe with notes about who taught it and where it came from, so your family can keep it for generations.
              </p>
            </article>
          ) : (
            <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {recipes.map((recipe) => (
                <li
                  key={recipe.id}
                  className="surface-card p-4 transition-transform hover:-translate-y-0.5"
                >
                  <Link href={`/recipes/${recipe.id}`} className="text-base font-semibold hover:underline">
                    {recipe.title}
                  </Link>
                  <p className="mt-2 text-xs uppercase tracking-wide text-[var(--color-text-muted)]">Added on</p>
                  <p className="text-sm text-[var(--color-text-muted)]">{new Date(recipe.createdAt).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          )}

          <aside className="surface-card p-5">
            <h2 className="text-lg font-semibold">Preservation Features</h2>
            <div id="home-preservation-features" className="mt-4 space-y-3 text-sm text-[var(--color-text-muted)]">
              <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3">
                <h3 className="font-semibold text-[var(--color-text)]">Family Story Layer</h3>
                <p className="mt-1">Capture who taught the recipe and why it matters to your family.</p>
              </article>
              <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3">
                <h3 className="font-semibold text-[var(--color-text)]">Generation Timeline</h3>
                <p className="mt-1">Follow recipes from grandparents to children in one shared archive.</p>
              </article>
              <article className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3">
                <h3 className="font-semibold text-[var(--color-text)]">Distance-Friendly Sharing</h3>
                <p className="mt-1">Keep family connected around food even when everyone lives far apart.</p>
              </article>
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
