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
  visibility: "public" | "private" | "family";
  families: Array<{ id: number; name: string }>;
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
  const cookie = requestHeaders.get("cookie") ?? "";

  const response = await fetch(
    `${baseUrl}/api/recipes/${id}?includePrimaryImage=true&includeImages=true`,
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

export default async function RecipeDetailPage({ params }: Params) {
  const { id } = await params;
  const [recipe, authUser] = await Promise.all([fetchRecipe(id), getOptionalAuthPageUser()]);
  const canManageRecipe = authUser?.user_id === recipe.createdByUserId;

  return (
    <main id="recipe-detail-main" className="app-shell max-w-5xl space-y-6">
      <section id="recipe-detail-header-section" className="surface-panel space-y-5 p-6 sm:p-8">
        <div id="recipe-detail-header-row" className="page-header-bar">
          <div id="recipe-detail-header-copy" className="page-header-copy">
            <p id="recipe-detail-header-eyebrow" className="page-eyebrow">Recipe Detail</p>
            <h1 id="recipe-detail-title" className="text-2xl font-semibold sm:text-3xl">{recipe.title}</h1>
            <p id="recipe-detail-created-at" className="page-supporting-text">Created {new Date(recipe.createdAt).toLocaleString()}</p>
          </div>

          <div id="recipe-detail-actions" className="flex flex-wrap items-center gap-2">
            <Link id="recipe-detail-back-link" href="/" className={buttonClassName("secondary")}>
              Back to list
            </Link>
            {canManageRecipe ? (
              <>
                <Link id="recipe-detail-edit-link" href={`/recipes/${recipe.id}/edit`} className={buttonClassName("primary")}>
                  Edit Recipe
                </Link>
                <DeleteRecipeButton recipeId={recipe.id} />
              </>
            ) : null}
          </div>
        </div>

        <p id="recipe-detail-visibility" className="text-xs uppercase tracking-wide text-[var(--color-primary)]">
          {recipe.visibility === "family"
            ? `Shared with: ${recipe.families.map((family) => family.name).join(", ")}`
            : recipe.visibility === "private"
              ? "Private to owner"
              : "Public"}
        </p>
        {recipe.primaryImage ? (
          <img
            id="recipe-detail-primary-image"
            src={recipe.primaryImage.fullUrl}
            alt={recipe.title}
            className="h-72 w-full rounded-[var(--radius-md)] object-cover"
          />
        ) : null}

        {recipe.description ? <p id="recipe-detail-description" className="text-[var(--color-text)]">{recipe.description}</p> : null}

        <div id="recipe-detail-metadata-pills" className="detail-metadata-pills">
          <span id="recipe-detail-ingredient-count-pill" className="detail-metadata-pill">
            {recipe.ingredients.length} ingredient{recipe.ingredients.length === 1 ? "" : "s"}
          </span>
          <span id="recipe-detail-image-count-pill" className="detail-metadata-pill">
            {recipe.images?.length ?? 0} image{recipe.images?.length === 1 ? "" : "s"}
          </span>
        </div>
      </section>

      {recipe.images && recipe.images.length > 0 ? (
        <section id="recipe-detail-gallery-section" className="surface-card p-5">
          <h2 id="recipe-detail-gallery-title" className="mb-3 text-lg font-semibold">Gallery</h2>
          <ul id="recipe-detail-gallery-list" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {recipe.images.map((image) => (
              <li id={`recipe-detail-gallery-item-${image.id}`} key={image.id}>
                <img
                  id={`recipe-detail-gallery-image-${image.id}`}
                  src={`/api/recipe-images/${image.id}/file?variant=thumb`}
                  alt={image.isPrimary ? "Primary recipe image" : "Recipe image"}
                  className="h-28 w-full rounded-[var(--radius-sm)] object-cover"
                />
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section id="recipe-detail-ingredients-section" className="surface-card p-5">
        <h2 id="recipe-detail-ingredients-title" className="mb-3 text-lg font-semibold">Ingredients</h2>
        <ul id="recipe-detail-ingredients-list" className="space-y-2">
          {recipe.ingredients.map((ingredient) => (
            <li id={`recipe-detail-ingredient-${ingredient.id}`} key={ingredient.id} className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-soft)] p-3">
              <div id={`recipe-detail-ingredient-primary-${ingredient.id}`} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <span id={`recipe-detail-ingredient-name-${ingredient.id}`} className="font-medium">{ingredient.name}</span>
                <span id={`recipe-detail-ingredient-qty-${ingredient.id}`} className="text-[var(--color-text-muted)]">
                  {formatQuantity(ingredient.qty)} {ingredient.unit}
                </span>
              </div>
              {ingredient.notes ? <p id={`recipe-detail-ingredient-notes-${ingredient.id}`} className="mt-1 text-sm text-[var(--color-text-muted)]">{ingredient.notes}</p> : null}
            </li>
          ))}
        </ul>
      </section>

      <section id="recipe-detail-steps-section" className="surface-card p-5">
        <h2 id="recipe-detail-steps-title" className="mb-3 text-lg font-semibold">Steps</h2>
        <div id="recipe-detail-steps-content" className="space-y-2 text-[var(--color-text)] [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6">
          <ReactMarkdown>{recipe.stepsMarkdown}</ReactMarkdown>
        </div>
      </section>
    </main>
  );
}
