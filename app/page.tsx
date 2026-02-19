// Home page that lists recipes from the API.
import Link from "next/link";
import { headers } from "next/headers";
import { getOptionalAuthPageUser } from "@/lib/auth/page-auth-user";
import LogoutButton from "@/app/_components/logout-button";

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
  const [recipesResponse, authUser] = await Promise.all([
    fetchRecipes(),
    getOptionalAuthPageUser(),
  ]);
  const { recipes } = recipesResponse;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Recipes</h1>
        <div className="flex items-center gap-3">
          {!authUser ? (
            <>
              <Link href="/register" className="text-sm underline">
                Register
              </Link>
              <Link href="/login" className="text-sm underline">
                Login
              </Link>
            </>
          ) : (
            <LogoutButton />
          )}
          <Link href="/account/change-password" className="text-sm underline">
            Change Password
          </Link>
          <Link href="/recipes/new" className="rounded bg-black px-3 py-2 text-sm text-white">
            New Recipe
          </Link>
        </div>
      </div>

      {recipes.length === 0 ? (
        <p className="text-sm text-zinc-600">No recipes yet.</p>
      ) : (
        <ul className="space-y-3">
          {recipes.map((recipe) => (
            <li key={recipe.id} className="rounded border border-zinc-200 p-3">
              <Link href={`/recipes/${recipe.id}`} className="font-medium hover:underline">
                {recipe.title}
              </Link>
              <p className="mt-1 text-sm text-zinc-600">
                {new Date(recipe.createdAt).toLocaleString()}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
