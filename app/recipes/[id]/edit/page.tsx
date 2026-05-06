import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import RecipeWorkspaceFrame from "@/app/_components/recipe-workspace-frame";
import EditRecipeForm from "@/app/recipes/[id]/edit/edit-recipe-form";
import { requireAuthPage } from "@/lib/auth/require-auth-page";
import { buttonClassName } from "@/app/_components/ui/button-styles";
import type { RecipeLanguage } from "@/lib/domain/recipe-language";
import { getRequestMessages } from "@/lib/i18n/server";

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

type RecipeSourceDocument = {
  id: number;
  originalFilename: string;
  fileUrl: string;
  publiclyVisible?: boolean;
  isPrimary?: boolean;
};

type Recipe = {
  id: number;
  title: string;
  description: string | null;
  stepsMarkdown: string;
  language: RecipeLanguage;
  visibility: "public" | "private" | "family";
  families: Array<{ id: number; name: string }>;
  ingredients: Ingredient[];
  images?: RecipeImage[];
  primaryImage?: { id: number } | null;
  sourceDocuments?: Array<{
    id: number;
    originalFilename: string;
    thumbnailUrl: string;
    fullUrl: string;
    publiclyVisible: boolean;
    isPrimary: boolean;
  }>;
};

type RecipeResponse = {
  recipe?: Recipe;
  error?: string;
};

type RecipeSourceDocumentsResponse = {
  sourceDocuments?: RecipeSourceDocument[];
  error?: string;
};

type Params = {
  params: Promise<{ id: string }>;
};

function getBaseUrl(requestHeaders: Headers) {
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host");
  const protocol =
    requestHeaders.get("x-forwarded-proto") ??
    (host?.includes("localhost") || host?.startsWith("127.0.0.1") ? "http" : "https");

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

async function fetchRecipeSourceDocuments(id: string) {
  const requestHeaders = await headers();
  const baseUrl = getBaseUrl(requestHeaders);
  const cookie = requestHeaders.get("cookie") ?? "";

  const response = await fetch(`${baseUrl}/api/recipes/${id}/source-documents`, {
    cache: "no-store",
    headers: cookie ? { cookie } : undefined,
  });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as RecipeSourceDocumentsResponse;
  return (data.sourceDocuments ?? []).map((sourceDocument) => ({
    id: sourceDocument.id,
    originalFilename: sourceDocument.originalFilename,
    thumbnailUrl: sourceDocument.fileUrl,
    fullUrl: sourceDocument.fileUrl,
    publiclyVisible: sourceDocument.publiclyVisible === true,
    isPrimary: sourceDocument.isPrimary === true,
  }));
}

export default async function EditRecipePage({ params }: Params) {
  const authUser = await requireAuthPage();

  const { id } = await params;
  const [{ locale, messages }, recipe, sourceDocuments] = await Promise.all([
    getRequestMessages(),
    fetchRecipe(id),
    fetchRecipeSourceDocuments(id),
  ]);

  return (
    <RecipeWorkspaceFrame
      authUser={authUser}
      contentId="edit-recipe-workspace-content"
      idPrefix="edit-recipe"
      locale={locale}
      messages={messages}
    >
      <section id="edit-recipe-main" className="max-w-5xl space-y-6">
        <div id="edit-recipe-panel" className="surface-panel space-y-6 p-6 sm:p-8">
          <div id="edit-recipe-header" className="flex items-center justify-between gap-3">
            <h1 id="edit-recipe-title" className="text-2xl font-semibold">{messages.recipe.editTitle}</h1>
            <div id="edit-recipe-header-actions" className="flex flex-wrap items-center justify-end gap-2">
              <Link id="edit-recipe-back-link" href={`/recipes/${recipe.id}`} className={buttonClassName("secondary")}>
                {messages.common.backToRecipes}
              </Link>
            </div>
          </div>

          <EditRecipeForm recipe={{ ...recipe, sourceDocuments }} />
        </div>
      </section>
    </RecipeWorkspaceFrame>
  );
}
