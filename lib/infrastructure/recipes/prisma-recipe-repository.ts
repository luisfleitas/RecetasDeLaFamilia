import { getPrisma } from "@/lib/prisma";
import type {
  AddRecipeImageInput,
  CreateIngredientInput,
  CreateRecipeInput,
  Ingredient,
  PrimaryImageRef,
  Recipe,
  RecipeImage,
  RecipeListItem,
} from "@/lib/domain/recipe";
import type {
  GetRecipeByIdOptions,
  ListRecipeOptions,
  RecipeRepository,
} from "@/lib/domain/recipe-repository";
import type { Prisma, RecipeVisibility as PrismaRecipeVisibility } from "@prisma/client";

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

function toPrimaryImageRef(imageId: number): PrimaryImageRef {
  return {
    id: imageId,
    thumbnailUrl: `/api/recipe-images/${imageId}/file?variant=thumb`,
    fullUrl: `/api/recipe-images/${imageId}/file?variant=full`,
  };
}

function toPrismaVisibility(value: CreateRecipeInput["visibility"]): PrismaRecipeVisibility {
  return value as unknown as PrismaRecipeVisibility;
}

function buildRecipeAccessWhere(viewerUserId: number | null | undefined): Prisma.RecipeWhereInput {
  if (!viewerUserId) {
    return {
      visibility: toPrismaVisibility("public"),
    };
  }

  return {
    OR: [
      { visibility: toPrismaVisibility("public") },
      { createdByUserId: viewerUserId },
      {
        visibility: toPrismaVisibility("family"),
        familyLinks: {
          some: {
            family: {
              memberships: {
                some: {
                  userId: viewerUserId,
                },
              },
            },
          },
        },
      },
    ],
  };
}

function toRecipeImage(image: {
  id: number;
  recipeId: number;
  storageKey: string;
  thumbnailKey: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  position: number;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
}): RecipeImage {
  return {
    id: image.id,
    recipeId: image.recipeId,
    storageKey: image.storageKey,
    thumbnailKey: image.thumbnailKey,
    originalFilename: image.originalFilename,
    mimeType: image.mimeType,
    sizeBytes: image.sizeBytes,
    width: image.width,
    height: image.height,
    position: image.position,
    isPrimary: image.isPrimary,
    createdAt: image.createdAt,
    updatedAt: image.updatedAt,
  };
}

type RecipeImageRow = {
  id: number;
  recipeId: number;
  storageKey: string;
  thumbnailKey: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  width: number;
  height: number;
  position: number;
  isPrimary: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export class PrismaRecipeRepository implements RecipeRepository {
  async list(options?: ListRecipeOptions): Promise<RecipeListItem[]> {
    const prisma = await getPrisma();
    const includePrimaryImage = Boolean(options?.includePrimaryImage);
    const includeImages = Boolean(options?.includeImages);
    const accessWhere = buildRecipeAccessWhere(options?.viewerUserId);
    if (includePrimaryImage || includeImages) {
      const recipes = await prisma.recipe.findMany({
        where: accessWhere,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          title: true,
          visibility: true,
          createdByUserId: true,
          createdAt: true,
          familyLinks: {
            select: {
              family: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          images: {
            ...(includeImages
              ? {
                  orderBy: { position: "asc" as const },
                }
              : {
                  where: { isPrimary: true },
                  take: 1,
                }),
            select: { id: true, isPrimary: true },
          },
        },
      });

      return recipes.map((recipe) => {
        const primaryImage = recipe.images.find((image) => image.isPrimary) ?? null;

        return {
          id: recipe.id,
          title: recipe.title,
          visibility: recipe.visibility,
          createdByUserId: recipe.createdByUserId,
          createdAt: recipe.createdAt,
          families: recipe.familyLinks.map((link) => ({
            id: link.family.id,
            name: link.family.name,
          })),
          ...(includePrimaryImage
            ? {
                primaryImage: primaryImage ? toPrimaryImageRef(primaryImage.id) : null,
              }
            : {}),
          ...(includeImages
            ? {
                images: recipe.images.map((image) => toPrimaryImageRef(image.id)),
              }
            : {}),
        };
      });
    }

    return prisma.recipe.findMany({
      where: accessWhere,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        visibility: true,
        createdByUserId: true,
        createdAt: true,
        familyLinks: {
          select: {
            family: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    }).then((recipes) =>
      recipes.map((recipe) => ({
        id: recipe.id,
        title: recipe.title,
        visibility: recipe.visibility,
        createdByUserId: recipe.createdByUserId,
        createdAt: recipe.createdAt,
        families: recipe.familyLinks.map((link) => ({
          id: link.family.id,
          name: link.family.name,
        })),
      })),
    );
  }

  async getById(id: number, options?: GetRecipeByIdOptions): Promise<Recipe | null> {
    const prisma = await getPrisma();
    const includeImages = Boolean(options?.includeImages);
    const includePrimaryImage = Boolean(options?.includePrimaryImage);
    const shouldLoadImages = includeImages || includePrimaryImage;
    const accessWhere = buildRecipeAccessWhere(options?.viewerUserId);
    const recipe = shouldLoadImages
      ? await prisma.recipe.findFirst({
          where: {
            id,
            ...accessWhere,
          },
          include: {
            ingredients: {
              orderBy: { position: "asc" },
            },
            familyLinks: {
              select: {
                family: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            images: {
              orderBy: { position: "asc" },
            },
          },
        })
      : await prisma.recipe.findFirst({
          where: {
            id,
            ...accessWhere,
          },
          include: {
            ingredients: {
              orderBy: { position: "asc" },
            },
            familyLinks: {
              select: {
                family: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        });

    if (!recipe) {
      return null;
    }

    const imageRows = shouldLoadImages
      ? ((recipe as unknown as { images: RecipeImageRow[] }).images ?? [])
      : [];
    const images = imageRows.map(toRecipeImage);
    const primary = images.find((image) => image.isPrimary) ?? null;

    return {
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      stepsMarkdown: recipe.stepsMarkdown,
      visibility: recipe.visibility,
      families: recipe.familyLinks.map((link) => ({
        id: link.family.id,
        name: link.family.name,
      })),
      createdByUserId: recipe.createdByUserId,
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
      ingredients: recipe.ingredients.map(toIngredient),
      images: includeImages ? images : undefined,
      ...(includePrimaryImage
        ? {
            primaryImage: primary ? toPrimaryImageRef(primary.id) : null,
          }
        : {}),
    };
  }

  async getOwnerById(id: number): Promise<number | null> {
    const prisma = await getPrisma();

    const recipe = await prisma.recipe.findUnique({
      where: { id },
      select: { createdByUserId: true },
    });

    return recipe?.createdByUserId ?? null;
  }

  async create(input: CreateRecipeInput, createdByUserId: number): Promise<Recipe> {
    const prisma = await getPrisma();
    const uniqueFamilyIds = [...new Set(input.familyIds)];
    const familyConnect =
      input.visibility === "family"
        ? uniqueFamilyIds.map((familyId) => ({
            familyId,
          }))
        : [];

    const recipe = await prisma.$transaction(async (tx) => {
      if (input.visibility === "family") {
        const membershipCount = await tx.familyMembership.count({
          where: {
            userId: createdByUserId,
            familyId: {
              in: uniqueFamilyIds,
            },
          },
        });

        if (membershipCount !== uniqueFamilyIds.length) {
          throw new Error("FORBIDDEN_FAMILY_LINK");
        }
      }

      return tx.recipe.create({
        data: {
          title: input.title,
          description: input.description,
          stepsMarkdown: input.stepsMarkdown,
          visibility: toPrismaVisibility(input.visibility),
          createdByUserId,
          ingredients: {
            create: toCreateIngredientData(input.ingredients),
          },
          familyLinks: familyConnect.length > 0 ? { create: familyConnect } : undefined,
        },
        include: {
          ingredients: {
            orderBy: { position: "asc" },
          },
          familyLinks: {
            select: {
              family: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
    });

    return {
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      stepsMarkdown: recipe.stepsMarkdown,
      visibility: recipe.visibility,
      families: recipe.familyLinks.map((link) => ({
        id: link.family.id,
        name: link.family.name,
      })),
      createdByUserId: recipe.createdByUserId,
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
      ingredients: recipe.ingredients.map(toIngredient),
    };
  }

  async update(id: number, input: CreateRecipeInput): Promise<Recipe | null> {
    const prisma = await getPrisma();
    const existingRecipe = await prisma.recipe.findUnique({
      where: { id },
      select: { id: true, createdByUserId: true },
    });

    if (!existingRecipe) {
      return null;
    }
    const uniqueFamilyIds = [...new Set(input.familyIds)];

    const recipe = await prisma.$transaction(async (tx) => {
      if (input.visibility === "family") {
        const membershipCount = await tx.familyMembership.count({
          where: {
            userId: existingRecipe.createdByUserId,
            familyId: {
              in: uniqueFamilyIds,
            },
          },
        });

        if (membershipCount !== uniqueFamilyIds.length) {
          throw new Error("FORBIDDEN_FAMILY_LINK");
        }
      }

      return tx.recipe.update({
        where: { id },
        data: {
          title: input.title,
          description: input.description,
          stepsMarkdown: input.stepsMarkdown,
          visibility: toPrismaVisibility(input.visibility),
          ingredients: {
            deleteMany: {},
            create: toCreateIngredientData(input.ingredients),
          },
          familyLinks: {
            deleteMany: {},
            ...(input.visibility === "family"
              ? {
                  create: uniqueFamilyIds.map((familyId) => ({
                    familyId,
                  })),
                }
              : {}),
          },
        },
        include: {
          ingredients: {
            orderBy: { position: "asc" },
          },
          familyLinks: {
            select: {
              family: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
    });

    return {
      id: recipe.id,
      title: recipe.title,
      description: recipe.description,
      stepsMarkdown: recipe.stepsMarkdown,
      visibility: recipe.visibility,
      families: recipe.familyLinks.map((link) => ({
        id: link.family.id,
        name: link.family.name,
      })),
      createdByUserId: recipe.createdByUserId,
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
      ingredients: recipe.ingredients.map(toIngredient),
    };
  }

  async delete(id: number): Promise<boolean> {
    const prisma = await getPrisma();

    const existingRecipe = await prisma.recipe.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existingRecipe) {
      return false;
    }

    await prisma.recipe.delete({ where: { id } });
    return true;
  }

  async addImage(recipeId: number, input: AddRecipeImageInput): Promise<RecipeImage> {
    const prisma = await getPrisma();

    if (input.isPrimary) {
      await prisma.recipeImage.updateMany({
        where: { recipeId },
        data: { isPrimary: false },
      });
    }

    const created = await prisma.recipeImage.create({
      data: {
        recipeId,
        storageKey: input.storageKey,
        thumbnailKey: input.thumbnailKey,
        originalFilename: input.originalFilename,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        width: input.width,
        height: input.height,
        position: input.position,
        isPrimary: input.isPrimary,
      },
    });

    return toRecipeImage(created);
  }

  async countImagesByRecipeId(recipeId: number): Promise<number> {
    const prisma = await getPrisma();
    return prisma.recipeImage.count({ where: { recipeId } });
  }

  async setPrimaryImage(recipeId: number, imageId: number): Promise<boolean> {
    const prisma = await getPrisma();
    const target = await prisma.recipeImage.findFirst({
      where: { id: imageId, recipeId },
      select: { id: true },
    });

    if (!target) {
      return false;
    }

    await prisma.$transaction([
      prisma.recipeImage.updateMany({
        where: { recipeId },
        data: { isPrimary: false },
      }),
      prisma.recipeImage.update({
        where: { id: imageId },
        data: { isPrimary: true },
      }),
    ]);

    return true;
  }

  async getPrimaryImageByRecipeId(recipeId: number): Promise<RecipeImage | null> {
    const prisma = await getPrisma();
    const image = await prisma.recipeImage.findFirst({
      where: { recipeId, isPrimary: true },
      orderBy: { position: "asc" },
    });

    return image ? toRecipeImage(image) : null;
  }

  async getImageById(imageId: number): Promise<RecipeImage | null> {
    const prisma = await getPrisma();
    const image = await prisma.recipeImage.findUnique({
      where: { id: imageId },
    });

    return image ? toRecipeImage(image) : null;
  }

  async deleteImageById(
    recipeId: number,
    imageId: number,
  ): Promise<{ deleted: boolean; deletedImage: RecipeImage | null; promotedPrimaryImageId: number | null }> {
    const prisma = await getPrisma();

    return prisma.$transaction(async (tx) => {
      const image = await tx.recipeImage.findFirst({
        where: { id: imageId, recipeId },
      });

      if (!image) {
        return { deleted: false, deletedImage: null, promotedPrimaryImageId: null };
      }

      await tx.recipeImage.delete({
        where: { id: image.id },
      });

      let promotedPrimaryImageId: number | null = null;

      if (image.isPrimary) {
        await tx.recipeImage.updateMany({
          where: { recipeId },
          data: { isPrimary: false },
        });

        const nextPrimary = await tx.recipeImage.findFirst({
          where: { recipeId },
          orderBy: { position: "asc" },
          select: { id: true },
        });

        if (nextPrimary) {
          await tx.recipeImage.update({
            where: { id: nextPrimary.id },
            data: { isPrimary: true },
          });
          promotedPrimaryImageId = nextPrimary.id;
        }
      }

      return {
        deleted: true,
        deletedImage: toRecipeImage(image),
        promotedPrimaryImageId,
      };
    });
  }
}
