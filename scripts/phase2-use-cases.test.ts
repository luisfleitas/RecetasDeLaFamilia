import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { test } from "node:test";
import sharp from "sharp";
import { makeRecipeUseCases } from "../lib/application/recipes/use-cases";
import type { UploadedRecipeImage } from "../lib/application/recipes/use-cases";
import type { RecipeRepository } from "../lib/domain/recipe-repository";
import type {
  AddRecipeImageInput,
  CreateRecipeInput,
  Ingredient,
  Recipe,
  RecipeImage,
  RecipeListItem,
} from "../lib/domain/recipe";
import type {
  GetRecipeByIdOptions,
  ListRecipeOptions,
} from "../lib/domain/recipe-repository";
import type {
  ImageStorageProvider,
  PutObjectInput,
} from "../lib/infrastructure/images/image-storage-provider";

class InMemoryStorageProvider implements ImageStorageProvider {
  public objects = new Map<string, Buffer>();
  public failDelete = false;

  async putObject(input: PutObjectInput) {
    this.objects.set(input.key, input.buffer);
  }

  async getObjectStream(_key: string) {
    return Readable.from(Buffer.alloc(0));
  }

  async deleteObject(key: string) {
    if (this.failDelete) {
      throw new Error("storage delete failed");
    }
    this.objects.delete(key);
  }

  getPublicUrl(key: string) {
    return `/uploads/${key}`;
  }
}

class FakeRecipeRepository implements RecipeRepository {
  private nextRecipeId = 1;
  private nextImageId = 1;
  private readonly recipes = new Map<number, Recipe>();
  private readonly images = new Map<number, RecipeImage>();

  async list(_options?: ListRecipeOptions): Promise<RecipeListItem[]> {
    return [...this.recipes.values()].map((recipe) => ({
      id: recipe.id,
      title: recipe.title,
      visibility: recipe.visibility,
      families: recipe.families,
      createdByUserId: recipe.createdByUserId,
      createdAt: recipe.createdAt,
    }));
  }

  async getById(id: number, options?: GetRecipeByIdOptions): Promise<Recipe | null> {
    const recipe = this.recipes.get(id);
    if (!recipe) {
      return null;
    }

    const recipeImages = [...this.images.values()]
      .filter((image) => image.recipeId === id)
      .sort((a, b) => a.position - b.position);

    const primary = recipeImages.find((image) => image.isPrimary) ?? null;

    return {
      ...recipe,
      images: options?.includeImages ? recipeImages : undefined,
      ...(options?.includePrimaryImage
        ? {
            primaryImage: primary
              ? {
                  id: primary.id,
                  fullUrl: `/api/recipe-images/${primary.id}/file?variant=full`,
                  thumbnailUrl: `/api/recipe-images/${primary.id}/file?variant=thumb`,
                }
              : null,
          }
        : {}),
    };
  }

  async getOwnerById(id: number): Promise<number | null> {
    return this.recipes.get(id)?.createdByUserId ?? null;
  }

  async create(input: CreateRecipeInput, createdByUserId: number): Promise<Recipe> {
    const recipe: Recipe = {
      id: this.nextRecipeId++,
      title: input.title,
      description: input.description,
      stepsMarkdown: input.stepsMarkdown,
      visibility: input.visibility,
      families: [],
      createdByUserId,
      createdAt: new Date(),
      updatedAt: new Date(),
      ingredients: input.ingredients.map(
        (ingredient, index): Ingredient => ({
          id: index + 1,
          name: ingredient.name,
          qty: ingredient.qty,
          unit: ingredient.unit,
          notes: ingredient.notes,
          position: ingredient.position,
          createdAt: new Date(),
          updatedAt: new Date(),
        }),
      ),
    };

    this.recipes.set(recipe.id, recipe);
    return recipe;
  }

  async update(id: number, input: CreateRecipeInput): Promise<Recipe | null> {
    const current = this.recipes.get(id);
    if (!current) {
      return null;
    }

    const updated: Recipe = {
      ...current,
      title: input.title,
      description: input.description,
      stepsMarkdown: input.stepsMarkdown,
      visibility: input.visibility,
      families: [],
      updatedAt: new Date(),
    };

    this.recipes.set(id, updated);
    return updated;
  }

  async delete(id: number): Promise<boolean> {
    return this.recipes.delete(id);
  }

  async addImage(recipeId: number, input: AddRecipeImageInput): Promise<RecipeImage> {
    if (input.isPrimary) {
      for (const image of this.images.values()) {
        if (image.recipeId === recipeId) {
          image.isPrimary = false;
        }
      }
    }

    const image: RecipeImage = {
      id: this.nextImageId++,
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
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.images.set(image.id, image);
    return image;
  }

  async countImagesByRecipeId(recipeId: number): Promise<number> {
    return [...this.images.values()].filter((image) => image.recipeId === recipeId).length;
  }

  async setPrimaryImage(recipeId: number, imageId: number): Promise<boolean> {
    const target = this.images.get(imageId);
    if (!target || target.recipeId !== recipeId) {
      return false;
    }

    for (const image of this.images.values()) {
      if (image.recipeId === recipeId) {
        image.isPrimary = image.id === imageId;
      }
    }

    return true;
  }

  async getPrimaryImageByRecipeId(recipeId: number): Promise<RecipeImage | null> {
    return [...this.images.values()].find((image) => image.recipeId === recipeId && image.isPrimary) ?? null;
  }

  async getImageById(imageId: number): Promise<RecipeImage | null> {
    return this.images.get(imageId) ?? null;
  }

  async deleteImageById(recipeId: number, imageId: number) {
    const image = this.images.get(imageId);
    if (!image || image.recipeId !== recipeId) {
      return { deleted: false, deletedImage: null, promotedPrimaryImageId: null };
    }

    this.images.delete(imageId);

    let promotedPrimaryImageId: number | null = null;
    if (image.isPrimary) {
      const remaining = [...this.images.values()]
        .filter((candidate) => candidate.recipeId === recipeId)
        .sort((a, b) => a.position - b.position);

      for (const candidate of remaining) {
        candidate.isPrimary = false;
      }

      if (remaining.length > 0) {
        remaining[0].isPrimary = true;
        promotedPrimaryImageId = remaining[0].id;
      }
    }

    return {
      deleted: true,
      deletedImage: image,
      promotedPrimaryImageId,
    };
  }
}

function sampleRecipeInput(): CreateRecipeInput {
  return {
    title: "Test",
    description: "desc",
    stepsMarkdown: "step",
    visibility: "private",
    familyIds: [],
    ingredients: [{ name: "salt", qty: 1, unit: "tsp", notes: null, position: 1 }],
  };
}

async function sampleImage(index: number): Promise<UploadedRecipeImage> {
  const buffer = await sharp({
    create: {
      width: 64,
      height: 64,
      channels: 3,
      background: { r: 120 + index, g: 90 + index, b: 60 + index },
    },
  })
    .png()
    .toBuffer();

  return {
    originalFilename: `sample-${index}.png`,
    mimeType: "image/png",
    sizeBytes: buffer.length,
    buffer,
  };
}

async function buildRecipeWithThreeImages(repo: FakeRecipeRepository, storage: InMemoryStorageProvider) {
  const useCases = makeRecipeUseCases(repo, { storageProvider: storage });
  const recipe = await useCases.createRecipeWithImages(1, {
    recipe: sampleRecipeInput(),
    images: [await sampleImage(1), await sampleImage(2), await sampleImage(3)],
    primaryImageIndex: 1,
  });

  assert.ok(recipe.images);
  assert.equal(recipe.images?.length, 3);

  return { useCases, recipeId: recipe.id, imageIds: recipe.images!.map((image) => image.id) };
}

test("owner deletes non-primary image successfully", async () => {
  const repo = new FakeRecipeRepository();
  const storage = new InMemoryStorageProvider();
  const { useCases, recipeId, imageIds } = await buildRecipeWithThreeImages(repo, storage);

  const result = await useCases.deleteRecipeImage(1, recipeId, imageIds[0]);
  assert.equal(result.deleted, true);
  assert.equal(result.promotedPrimaryImageId, null);

  const remainingPrimary = await repo.getPrimaryImageByRecipeId(recipeId);
  assert.equal(remainingPrimary?.id, imageIds[1]);
});

test("deleting primary image auto-promotes first remaining image", async () => {
  const repo = new FakeRecipeRepository();
  const storage = new InMemoryStorageProvider();
  const { useCases, recipeId, imageIds } = await buildRecipeWithThreeImages(repo, storage);

  const result = await useCases.deleteRecipeImage(1, recipeId, imageIds[1]);
  assert.equal(result.deleted, true);
  assert.equal(result.promotedPrimaryImageId, imageIds[0]);

  const remainingPrimary = await repo.getPrimaryImageByRecipeId(recipeId);
  assert.equal(remainingPrimary?.id, imageIds[0]);
});

test("deleting last image leaves recipe without a primary image", async () => {
  const repo = new FakeRecipeRepository();
  const storage = new InMemoryStorageProvider();
  const useCases = makeRecipeUseCases(repo, { storageProvider: storage });

  const recipe = await useCases.createRecipeWithImages(1, {
    recipe: sampleRecipeInput(),
    images: [await sampleImage(1)],
    primaryImageIndex: 0,
  });

  const imageId = recipe.images?.[0]?.id as number;
  const result = await useCases.deleteRecipeImage(1, recipe.id, imageId);

  assert.equal(result.deleted, true);
  assert.equal(result.promotedPrimaryImageId, null);

  const primary = await repo.getPrimaryImageByRecipeId(recipe.id);
  assert.equal(primary, null);
});

test("non-owner cannot delete image", async () => {
  const repo = new FakeRecipeRepository();
  const storage = new InMemoryStorageProvider();
  const { useCases, recipeId, imageIds } = await buildRecipeWithThreeImages(repo, storage);

  const result = await useCases.deleteRecipeImage(999, recipeId, imageIds[0]);
  assert.equal(result.deleted, false);
  assert.equal(result.forbidden, true);
});

test("unknown recipe/image returns notFound", async () => {
  const repo = new FakeRecipeRepository();
  const storage = new InMemoryStorageProvider();
  const useCases = makeRecipeUseCases(repo, { storageProvider: storage });

  const result = await useCases.deleteRecipeImage(1, 999, 999);
  assert.equal(result.deleted, false);
  assert.equal(result.notFound, true);
});

test("storage delete failure does not corrupt primary invariant", async () => {
  const repo = new FakeRecipeRepository();
  const storage = new InMemoryStorageProvider();
  const { useCases, recipeId, imageIds } = await buildRecipeWithThreeImages(repo, storage);

  storage.failDelete = true;

  await assert.rejects(() => useCases.deleteRecipeImage(1, recipeId, imageIds[1]), /storage delete failed/);

  const remainingPrimary = await repo.getPrimaryImageByRecipeId(recipeId);
  assert.equal(remainingPrimary?.id, imageIds[0]);
});
