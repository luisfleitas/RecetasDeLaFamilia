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

type Recipe = {
  id: number;
  title: string;
  description: string | null;
  stepsMarkdown: string;
  ingredients: Ingredient[];
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

  const response = await fetch(`${baseUrl}/api/recipes/${id}`, {
    cache: "no-store",
  });

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
    <main className="app-shell max-w-5xl space-y-6">
      <div className="surface-panel space-y-6 p-6 sm:p-8">
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold">Edit Recipe</h1>
          <Link href={`/recipes/${recipe.id}`} className={buttonClassName("secondary")}>
            Back to recipe
          </Link>
        </div>

        <EditRecipeForm recipe={recipe} />
      </div>
    </main>
  );
}
