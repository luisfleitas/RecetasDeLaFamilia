// Recipe detail page with rendered markdown steps.
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import DeleteRecipeButton from "@/app/recipes/[id]/_components/delete-recipe-button";

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
  createdAt: string;
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

function formatQuantity(qty: number) {
  return qty.toString();
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

export default async function RecipeDetailPage({ params }: Params) {
  const { id } = await params;
  const recipe = await fetchRecipe(id);

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{recipe.title}</h1>
        <div className="flex items-center gap-4">
          <Link href={`/recipes/${recipe.id}/edit`} className="text-sm underline">
            Edit
          </Link>
          <DeleteRecipeButton recipeId={recipe.id} />
          <Link href="/" className="text-sm underline">
            Back to list
          </Link>
        </div>
      </div>

      <p className="text-sm text-zinc-600">Created {new Date(recipe.createdAt).toLocaleString()}</p>

      {recipe.description ? <p className="text-zinc-800">{recipe.description}</p> : null}

      <section>
        <h2 className="mb-2 text-lg font-medium">Ingredients</h2>
        <ul className="space-y-2">
          {recipe.ingredients.map((ingredient) => (
            <li key={ingredient.id} className="rounded border border-zinc-200 p-2">
              <span className="font-medium">
                {formatQuantity(ingredient.qty)} {ingredient.unit}
              </span>{" "}
              {ingredient.name}
              {ingredient.notes ? <span className="text-zinc-600"> ({ingredient.notes})</span> : null}
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-medium">Steps</h2>
        <div className="space-y-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6">
          <ReactMarkdown>{recipe.stepsMarkdown}</ReactMarkdown>
        </div>
      </section>
    </main>
  );
}
