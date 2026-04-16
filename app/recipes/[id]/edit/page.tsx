import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import EditRecipeForm from "@/app/recipes/[id]/edit/edit-recipe-form";
import { requireAuthPage } from "@/lib/auth/require-auth-page";
import { buttonClassName } from "@/app/_components/ui/button-styles";

type Ingredient = {
  id: number;
  name: string;
  qty: number;
  unit: string;
  notes: string | null;
  position: number;
};

type RecipeImage = {
  id: number;
  isPrimary: boolean;
  position: number;
  fullUrl: string;
  thumbnailUrl: string;
};

type Recipe = {
  id: number;
  title: string;
  description: string | null;
  stepsMarkdown: string;
  visibility: "public" | "private" | "family";
  families: Array<{ id: number; name: string }>;
  ingredients: Ingredient[];
  images?: RecipeImage[];
  primaryImage?: { id: number } | null;
};

type RecipeResponse = {
  recipe?: Recipe;
  error?: string;
};

type Params = {
  params: Promise<{ id: string }>;
};

function getBaseUrl(requestHeaders: Headers) {
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "http";

  if (host) {
    return `${protocol}://${host}`;
  }

  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

async function fetchRecipe(id: string) {
  const requestHeaders = await headers();
  const baseUrl = getBaseUrl(requestHeaders);
  const cookie = requestHeaders.get("cookie") ?? "";

  const response = await fetch(
    `${baseUrl}/api/recipes/${id}?includeImages=true&includePrimaryImage=true`,
    {
      cache: "no-store",
      headers: cookie ? { cookie } : undefined,
    },
  );

  if (response.status === 404) {
    notFound();
  }

  if (!response.ok) {
    throw new Error("Failed to load recipe");
  }

  const data = (await response.json()) as RecipeResponse;

  if (!data.recipe) {
    throw new Error(data.error ?? "Recipe missing in response");
  }

  return data.recipe;
}

export default async function EditRecipePage({ params }: Params) {
  await requireAuthPage();

  const { id } = await params;
  const recipe = await fetchRecipe(id);

  return (
    <main id="edit-recipe-main" className="app-shell max-w-5xl space-y-6">
      <div id="edit-recipe-panel" className="surface-panel space-y-6 p-6 sm:p-8">
        <div id="edit-recipe-header" className="flex items-center justify-between gap-3">
          <h1 id="edit-recipe-title" className="text-2xl font-semibold">Edit Recipe</h1>
          <Link id="edit-recipe-back-link" href={`/recipes/${recipe.id}`} className={buttonClassName("secondary")}>
            Back to recipe
          </Link>
        </div>

        <EditRecipeForm recipe={recipe} />
      </div>
    </main>
  );
}
