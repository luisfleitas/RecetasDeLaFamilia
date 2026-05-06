import type { RecipeSourceDocumentMetadata } from "@/lib/application/recipes/source-documents";

export type RecipeMediaReference =
  | { type: "recipe-image"; id: number }
  | { type: "source-document"; id: number };

export type RecipeMediaRecipeImageInput = {
  id: number;
  label?: string;
  thumbnailUrl: string;
  fullUrl: string;
  isPrimary?: boolean;
};

export type RecipeMediaSourceDocumentInput = {
  id: number;
  originalFilename: string;
  thumbnailUrl: string;
  fullUrl: string;
  publiclyVisible: boolean;
};

export type RecipeMediaGroupItem = {
  id: string;
  label: string;
  thumbnailUrl: string;
  fullUrl: string;
  mediaReference: RecipeMediaReference;
  isPrimary: boolean;
  visibility: "public" | "private";
};

export type RecipeMediaGroup = {
  id: "recipe-images" | "imported-source-pages";
  items: RecipeMediaGroupItem[];
};

export type RecipeMediaCarouselItem = {
  id: string;
  type: RecipeMediaReference["type"];
  label: string;
  thumbnailUrl: string;
  fullUrl: string;
  accessibleLabel: string;
  isPrimary: boolean;
};

export type RecipeMediaGroups = {
  groups: RecipeMediaGroup[];
  primaryMediaReference: RecipeMediaReference | null;
};

type BuildRecipeMediaGroupsInput = {
  recipeImages: RecipeMediaRecipeImageInput[];
  sourceDocuments: RecipeMediaSourceDocumentInput[];
  primaryMediaReference?: RecipeMediaReference | null;
};

function assertPositiveMediaId(id: number) {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("Recipe media references must use positive id values.");
  }
}

export function serializeRecipeMediaReference(reference: RecipeMediaReference | null | undefined) {
  if (!reference) {
    return "";
  }

  assertPositiveMediaId(reference.id);
  return `${reference.type}:${reference.id}`;
}

export function parseRecipeMediaReference(value: unknown): RecipeMediaReference | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return null;
  }

  const match = /^(recipe-image|source-document):(-?\d+)$/.exec(value.trim());
  if (!match) {
    throw new Error("Expected primary media reference in the format recipe-image:1 or source-document:1.");
  }

  const id = Number(match[2]);
  assertPositiveMediaId(id);

  return {
    type: match[1] as RecipeMediaReference["type"],
    id,
  };
}

export function areRecipeMediaReferencesEqual(
  first: RecipeMediaReference | null | undefined,
  second: RecipeMediaReference | null | undefined,
) {
  return Boolean(first && second && first.type === second.type && first.id === second.id);
}

function getFallbackPrimaryReference(input: BuildRecipeMediaGroupsInput): RecipeMediaReference | null {
  const primaryRecipeImage = input.recipeImages.find((image) => image.isPrimary);
  if (primaryRecipeImage) {
    return { type: "recipe-image", id: primaryRecipeImage.id };
  }

  const firstRecipeImage = input.recipeImages[0];
  if (firstRecipeImage) {
    return { type: "recipe-image", id: firstRecipeImage.id };
  }

  const firstSourceDocument = input.sourceDocuments[0];
  if (firstSourceDocument) {
    return { type: "source-document", id: firstSourceDocument.id };
  }

  return null;
}

export function buildRecipeMediaGroups(input: BuildRecipeMediaGroupsInput): RecipeMediaGroups {
  const primaryMediaReference = input.primaryMediaReference ?? getFallbackPrimaryReference(input);
  const recipeImageItems: RecipeMediaGroupItem[] = input.recipeImages.map((image) => {
    const mediaReference: RecipeMediaReference = { type: "recipe-image", id: image.id };
    return {
      id: `recipe-image-${image.id}`,
      label: image.label ?? `Recipe image ${image.id}`,
      thumbnailUrl: image.thumbnailUrl,
      fullUrl: image.fullUrl,
      mediaReference,
      isPrimary: areRecipeMediaReferencesEqual(mediaReference, primaryMediaReference),
      visibility: "public",
    };
  });
  const sourceDocumentItems: RecipeMediaGroupItem[] = input.sourceDocuments.map((sourceDocument) => {
    const mediaReference: RecipeMediaReference = { type: "source-document", id: sourceDocument.id };
    return {
      id: `source-document-${sourceDocument.id}`,
      label: sourceDocument.originalFilename,
      thumbnailUrl: sourceDocument.thumbnailUrl,
      fullUrl: sourceDocument.fullUrl,
      mediaReference,
      isPrimary: areRecipeMediaReferencesEqual(mediaReference, primaryMediaReference),
      visibility: sourceDocument.publiclyVisible ? "public" : "private",
    };
  });

  return {
    groups: [
      { id: "recipe-images", items: recipeImageItems },
      { id: "imported-source-pages", items: sourceDocumentItems },
    ],
    primaryMediaReference,
  };
}

export function buildRecipeMediaCarouselItems(groups: RecipeMediaGroup[]): RecipeMediaCarouselItem[] {
  return groups.flatMap((group) =>
    group.items.map((item) => ({
      id: item.id,
      type: item.mediaReference.type,
      label: item.label,
      thumbnailUrl: item.thumbnailUrl,
      fullUrl: item.fullUrl,
      accessibleLabel:
        item.mediaReference.type === "source-document"
          ? `Open imported source page ${item.label}`
          : `Open recipe image ${item.label}`,
      isPrimary: item.isPrimary,
    })),
  );
}

export function buildSourceDocumentPrimaryMetadata(input: {
  sourceDocumentId: number;
  primaryMediaReference: RecipeMediaReference | null | undefined;
  publiclyVisible: boolean;
  sourceImageVisibility: "private" | "public";
}): RecipeSourceDocumentMetadata {
  return {
    inputMode: "handwritten",
    publiclyVisible: input.publiclyVisible,
    sourceImageVisibility: input.sourceImageVisibility,
    isPrimary:
      input.primaryMediaReference?.type === "source-document" &&
      input.primaryMediaReference.id === input.sourceDocumentId,
  };
}
