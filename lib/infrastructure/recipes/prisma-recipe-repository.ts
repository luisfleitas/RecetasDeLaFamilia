import { getPrisma } from "@/lib/prisma";
import {
  CreateIngredientInput,
  CreateRecipeInput,
  Ingredient,
  Recipe,
  RecipeListItem,
} from "@/lib/domain/recipe";
import { RecipeRepository } from "@/lib/domain/recipe-repository";

function gcd(a: number, b: number): number {
  let x = Math.abs(a);
  let y = Math.abs(b);

  while (y !== 0) {
    const temp = y;
    y = x % y;
    x = temp;
  }

  return x || 1;
}

function toFraction(value: number) {
  const denominator = 1000;
  const numerator = Math.round(value * denominator);
  const divisor = gcd(numerator, denominator);

  return {
    qtyNum: numerator / divisor,
    qtyDen: denominator / divisor,
  };
}

function toIngredient(ingredient: {
  id: number;
  name: string;
  qtyNum: number;
  qtyDen: number;
  unit: string;
  notes: string | null;
  position: number;
  createdAt: Date;
  updatedAt: Date;
}): Ingredient {
  return {
    id: ingredient.id,
    name: ingredient.name,
    qty: Number((ingredient.qtyNum / ingredient.qtyDen).toFixed(3)),
    unit: ingredient.unit,
    notes: ingredient.notes,
    position: ingredient.position,
    createdAt: ingredient.createdAt,
    updatedAt: ingredient.updatedAt,
  };
}

function toCreateIngredientData(ingredients: CreateIngredientInput[]) {
  return ingredients.map((ingredient) => {
    const { qtyNum, qtyDen } = toFraction(ingredient.qty);

    return {
      name: ingredient.name,
      qtyNum,
      qtyDen,
      unit: ingredient.unit,
      notes: ingredient.notes,
      position: ingredient.position,
    };
  });
}

export class PrismaRecipeRepository implements RecipeRepository {
  async list(): Promise<RecipeListItem[]> {
    const prisma = await getPrisma();

    return prisma.recipe.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        createdAt: true,
      },
    });
  }

  async getById(id: number): Promise<Recipe | null> {
    const prisma = await getPrisma();

    const recipe = await prisma.recipe.findUnique({
      where: { id },
      include: {
        ingredients: {
          orderBy: { position: "asc" },
        },
      },
    });

    if (!recipe) {
      return null;
    }

    return {
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      stepsMarkdown: recipe.stepsMarkdown,
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
      ingredients: recipe.ingredients.map(toIngredient),
    };
  }

  async create(input: CreateRecipeInput): Promise<Recipe> {
    const prisma = await getPrisma();

    const recipe = await prisma.recipe.create({
      data: {
        title: input.title,
        description: input.description,
        stepsMarkdown: input.stepsMarkdown,
        ingredients: {
          create: toCreateIngredientData(input.ingredients),
        },
      },
      include: {
        ingredients: {
          orderBy: { position: "asc" },
        },
      },
    });

    return {
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      stepsMarkdown: recipe.stepsMarkdown,
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
      ingredients: recipe.ingredients.map(toIngredient),
    };
  }

  async update(id: number, input: CreateRecipeInput): Promise<Recipe | null> {
    const prisma = await getPrisma();

    const existingRecipe = await prisma.recipe.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingRecipe) {
      return null;
    }

    const recipe = await prisma.recipe.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
        stepsMarkdown: input.stepsMarkdown,
        ingredients: {
          deleteMany: {},
          create: toCreateIngredientData(input.ingredients),
        },
      },
      include: {
        ingredients: {
          orderBy: { position: "asc" },
        },
      },
    });

    return {
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      stepsMarkdown: recipe.stepsMarkdown,
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
      ingredients: recipe.ingredients.map(toIngredient),
    };
  }
}
