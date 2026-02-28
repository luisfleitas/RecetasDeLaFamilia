import type { CreateRecipeInput } from "@/lib/domain/recipe";

export function sanitizeRecipeFamilyLinksForUpdate(
  input: CreateRecipeInput,
  allowedFamilyIds: number[],
): CreateRecipeInput {
  if (input.visibility !== "family") {
    return {
      ...input,
      familyIds: [],
    };
  }

  const allowedSet = new Set(allowedFamilyIds);
  const sanitizedFamilyIds = [...new Set(input.familyIds)].filter((familyId) => allowedSet.has(familyId));

  if (sanitizedFamilyIds.length === 0) {
    return {
      ...input,
      visibility: "private",
      familyIds: [],
    };
  }

  return {
    ...input,
    familyIds: sanitizedFamilyIds,
  };
}
