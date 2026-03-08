import { getRecipeImportParseTimeoutMs } from "@/lib/application/recipes/import-config";

export class RecipeImportParseTimeoutError extends Error {
  constructor(message = "Recipe import parsing timed out.") {
    super(message);
    this.name = "RecipeImportParseTimeoutError";
  }
}

export async function withRecipeImportParseTimeout<T>(operation: () => Promise<T>): Promise<T> {
  const timeoutMs = getRecipeImportParseTimeoutMs();

  return await new Promise<T>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      reject(new RecipeImportParseTimeoutError());
    }, timeoutMs);

    void operation()
      .then((value) => {
        clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        clearTimeout(timeoutId);
        reject(error);
      });
  });
}
