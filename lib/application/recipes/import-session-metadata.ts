import type { ImportWarning } from "@/lib/application/recipes/import-warnings";

export type ImportSessionSourceRef = {
  id?: number;
  sourceType: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  storageKey?: string;
};

export type ImportSessionMetadata = {
  warnings: ImportWarning[];
  sourceRefs: ImportSessionSourceRef[];
  providerName: string | null;
  providerModel: string | null;
  promptVersion: string | null;
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
