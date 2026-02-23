// Recipe detail page with rendered markdown steps.
import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
import DeleteRecipeButton from "@/app/recipes/[id]/_components/delete-recipe-button";
import { getOptionalAuthPageUser } from "@/lib/auth/page-auth-user";
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
};

type Recipe = {
  id: number;
  title: string;
  description: string | null;
  stepsMarkdown: string;
  createdByUserId: number;
  createdAt: string;
  ingredients: Ingredient[];
  images?: RecipeImage[];
  primaryImage?: { id: number; fullUrl: string; thumbnailUrl: string } | null;
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

  const response = await fetch(
    `${baseUrl}/api/recipes/${id}?includePrimaryImage=true&includeImages=true`,
    {
      cache: "no-store",
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

export default async function RecipeDetailPage({ params }: Params) {
  const { id } = await params;
  const [recipe, authUser] = await Promise.all([fetchRecipe(id), getOptionalAuthPageUser()]);
  const canManageRecipe = authUser?.user_id === recipe.createdByUserId;

  return (
    <main className="app-shell max-w-5xl space-y-6">
      <section className="surface-panel space-y-5 p-6 sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold sm:text-3xl">{recipe.title}</h1>
          <div className="flex flex-wrap items-center gap-2">
            {canManageRecipe ? (
              <>
                <Link href={`/recipes/${recipe.id}/edit`} className={buttonClassName("secondary")}>
                  Edit
                </Link>
                <DeleteRecipeButton recipeId={recipe.id} />
              </>
            ) : null}
            <Link href="/" className={buttonClassName("secondary")}>
              Back to list
            </Link>
          </div>
        </div>

        <p className="text-sm text-[var(--color-text-muted)]">Created {new Date(recipe.createdAt).toLocaleString()}</p>

        {recipe.primaryImage ? (
          <img
            src={recipe.primaryImage.fullUrl}
            alt={recipe.title}
            className="h-72 w-full rounded-[var(--radius-md)] object-cover"
          />
        ) : null}

        {recipe.description ? <p className="text-[var(--color-text)]">{recipe.description}</p> : null}
      </section>

      {recipe.images && recipe.images.length > 0 ? (
        <section className="surface-card p-5">
          <h2 className="mb-3 text-lg font-semibold">Gallery</h2>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {recipe.images.map((image) => (
              <li key={image.id}>
                <img
                  src={`/api/recipe-images/${image.id}/file?variant=thumb`}
                  alt={image.isPrimary ? "Primary recipe image" : "Recipe image"}
                  className="h-28 w-full rounded-[var(--radius-sm)] object-cover"
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="surface-card p-5">
        <h2 className="mb-3 text-lg font-semibold">Ingredients</h2>
        <ul className="space-y-2">
          {recipe.ingredients.map((ingredient) => (
            <li key={ingredient.id} className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-2">
              <span className="font-medium">
                {formatQuantity(ingredient.qty)} {ingredient.unit}
              </span>{" "}
              {ingredient.name}
              {ingredient.notes ? <span className="text-[var(--color-text-muted)]"> ({ingredient.notes})</span> : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="surface-card p-5">
        <h2 className="mb-3 text-lg font-semibold">Steps</h2>
        <div className="space-y-2 text-[var(--color-text)] [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6">
          <ReactMarkdown>{recipe.stepsMarkdown}</ReactMarkdown>
        </div>
      </section>
    </main>
  );
}
