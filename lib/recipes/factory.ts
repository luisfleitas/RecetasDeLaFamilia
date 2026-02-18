import { makeRecipeUseCases } from "@/lib/application/recipes/use-cases";
import { PrismaRecipeRepository } from "@/lib/infrastructure/recipes/prisma-recipe-repository";

const DEFAULT_ADAPTER = "prisma";

export function buildRecipeUseCases() {
  const adapter = process.env.DB_ADAPTER ?? DEFAULT_ADAPTER;

  switch (adapter) {
    case "prisma":
      return makeRecipeUseCases(new PrismaRecipeRepository());
    default:
      throw new Error(`Unsupported DB adapter: ${adapter}`);
  }
}
