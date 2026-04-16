import type { ImportWarning } from "@/lib/application/recipes/import-warnings";

export type RecipeImportInputMode = "document" | "handwritten";
export type HandwrittenSourceImageVisibility = "private" | "public";

export type ImportSessionSourceRef = {
  id?: number;
  sourceType: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey?: string;
};

export type HandwrittenImportMetadata = {
  imageCount: number;
  pageOrder: string[];
  ocrProviderUsed: string | null;
  ocrFallbackUsed: boolean;
  ocrProvidersByImage: string[];
  sourceImageVisibility: HandwrittenSourceImageVisibility;
  reviewHints: string[];
  combinedInUploadOrder: boolean;
};

export type ImportSessionMetadata = {
  inputMode: RecipeImportInputMode;
  warnings: ImportWarning[];
  sourceRefs: ImportSessionSourceRef[];
  providerName: string | null;
  providerModel: string | null;
  promptVersion: string | null;
  handwritten: HandwrittenImportMetadata | null;
};

export function parseImportWarningsJson(value: string | null): ImportWarning[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is ImportWarning => {
      if (!item || typeof item !== "object") {
        return false;
      }

      const typed = item as Partial<ImportWarning>;
      return typeof typed.code === "string" && typeof typed.message === "string";
    });
  } catch {
    return [];
  }
}

export function parseImportSourceRefsJson(value: string | null): ImportSessionSourceRef[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is ImportSessionSourceRef => {
      if (!item || typeof item !== "object") {
        return false;
      }

      const typed = item as Partial<ImportSessionSourceRef>;
      return (
        typeof typed.sourceType === "string" &&
        typeof typed.originalFilename === "string" &&
        typeof typed.mimeType === "string" &&
        typeof typed.sizeBytes === "number"
      );
    });
  } catch {
    return [];
  }
}

export function parseImportMetadataJson(value: string | null): ImportSessionMetadata | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = JSON.parse(value) as Partial<ImportSessionMetadata> | null;
    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    const inputMode = parsed.inputMode === "handwritten" ? "handwritten" : "document";
    const sourceRefs = Array.isArray(parsed.sourceRefs) ? parsed.sourceRefs : [];
    const warnings = Array.isArray(parsed.warnings) ? parsed.warnings : [];
    const handwrittenRaw = parsed.handwritten;

    const handwritten =
      handwrittenRaw &&
      typeof handwrittenRaw === "object" &&
      typeof handwrittenRaw.imageCount === "number" &&
      Array.isArray(handwrittenRaw.pageOrder)
        ? ({
            imageCount: handwrittenRaw.imageCount,
            pageOrder: handwrittenRaw.pageOrder.filter((item): item is string => typeof item === "string"),
            ocrProviderUsed:
              typeof handwrittenRaw.ocrProviderUsed === "string" ? handwrittenRaw.ocrProviderUsed : null,
            ocrFallbackUsed: handwrittenRaw.ocrFallbackUsed === true,
            ocrProvidersByImage: Array.isArray(handwrittenRaw.ocrProvidersByImage)
              ? handwrittenRaw.ocrProvidersByImage.filter((item): item is string => typeof item === "string")
              : [],
            sourceImageVisibility:
              handwrittenRaw.sourceImageVisibility === "public" ? "public" : "private",
            reviewHints: Array.isArray(handwrittenRaw.reviewHints)
              ? handwrittenRaw.reviewHints.filter((item): item is string => typeof item === "string")
              : [],
            combinedInUploadOrder: handwrittenRaw.combinedInUploadOrder !== false,
          } satisfies HandwrittenImportMetadata)
        : null;

    return {
      inputMode,
      warnings: warnings.filter((item): item is ImportWarning => {
        if (!item || typeof item !== "object") {
          return false;
        }

        const typed = item as Partial<ImportWarning>;
        return typeof typed.code === "string" && typeof typed.message === "string";
      }),
      sourceRefs: sourceRefs.filter((item): item is ImportSessionSourceRef => {
        if (!item || typeof item !== "object") {
          return false;
        }

        const typed = item as Partial<ImportSessionSourceRef>;
        return (
          typeof typed.sourceType === "string" &&
          typeof typed.originalFilename === "string" &&
          typeof typed.mimeType === "string" &&
          typeof typed.sizeBytes === "number"
        );
      }),
      providerName: typeof parsed.providerName === "string" ? parsed.providerName : null,
      providerModel: typeof parsed.providerModel === "string" ? parsed.providerModel : null,
      promptVersion: typeof parsed.promptVersion === "string" ? parsed.promptVersion : null,
      handwritten,
    };
  } catch {
    return null;
  }
}
