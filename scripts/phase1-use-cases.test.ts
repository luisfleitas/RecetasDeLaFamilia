import assert from "node:assert/strict";
import { Readable } from "node:stream";
import { test } from "node:test";
import sharp from "sharp";
import { makeRecipeUseCases } from "../lib/application/recipes/use-cases";
import type { UploadedRecipeImage } from "../lib/application/recipes/use-cases";
import type {
  GetRecipeByIdOptions,
  ListRecipeOptions,
  RecipeRepository,
} from "../lib/domain/recipe-repository";
import type {
  AddRecipeImageInput,
  CreateRecipeInput,
  Ingredient,
  Recipe,
  RecipeImage,
  RecipeListItem,
} from "../lib/domain/recipe";
import type {
  ImageStorageProvider,
  PutObjectInput,
} from "../lib/infrastructure/images/image-storage-provider";

class InMemoryStorageProvider implements ImageStorageProvider {
  public objects = new Map<string, Buffer>();

  async putObject(input: PutObjectInput) {
    this.objects.set(input.key, input.buffer);
  }

  async getObjectStream(_key: string) {
    return Readable.from(Buffer.alloc(0));
  }

  async deleteObject(key: string) {
    this.objects.delete(key);
  }

  getPublicUrl(key: string) {
    return `/uploads/${key}`;
  }
}

class FailOnNthPutStorageProvider extends InMemoryStorageProvider {
  private putCount = 0;
  private readonly failOnPutNumber: number;

  constructor(failOnPutNumber: number) {
    super();
    this.failOnPutNumber = failOnPutNumber;
  }

  async putObject(input: PutObjectInput) {
    this.putCount += 1;
    if (this.putCount === this.failOnPutNumber) {
      throw new Error("Simulated storage write failure");
    }

    await super.putObject(input);
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
    const deleted = this.recipes.delete(id);
    if (deleted) {
      for (const [imageId, image] of this.images.entries()) {
        if (image.recipeId === id) {
          this.images.delete(imageId);
        }
      }
    }

    return deleted;
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
    return { deleted: true, deletedImage: image, promotedPrimaryImageId: null };
  }
}

class TrackingRecipeRepository extends FakeRecipeRepository {
  public lastGetByIdOptions: GetRecipeByIdOptions | undefined;

  async getById(id: number, options?: GetRecipeByIdOptions): Promise<Recipe | null> {
    this.lastGetByIdOptions = options;
    return super.getById(id, options);
  }
}

class MissingAfterCreateRecipeRepository extends FakeRecipeRepository {
  async getById(id: number, options?: GetRecipeByIdOptions): Promise<Recipe | null> {
    if (options?.includeImages || options?.includePrimaryImage) {
      return null;
    }

    return super.getById(id, options);
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

async function sampleImage(mimeType = "image/png"): Promise<UploadedRecipeImage> {
  const buffer = await sharp({
    create: {
      width: 32,
      height: 32,
      channels: 3,
      background: { r: 100, g: 140, b: 80 },
    },
  })
    .png()
    .toBuffer();

  return {
    originalFilename: "test.png",
    mimeType,
    sizeBytes: buffer.length,
    buffer,
  };
}

test("createRecipeWithImages rejects unsupported mime type", async () => {
  const repo = new FakeRecipeRepository();
  const storage = new InMemoryStorageProvider();
  const useCases = makeRecipeUseCases(repo, { storageProvider: storage });

  const badImage = await sampleImage("image/gif");
  await assert.rejects(
    () =>
      useCases.createRecipeWithImages(1, {
        recipe: sampleRecipeInput(),
        images: [badImage],
      }),
    /Unsupported image type/,
  );
});

test("createRecipeWithImages rejects more than 8 images", async () => {
  const repo = new FakeRecipeRepository();
  const storage = new InMemoryStorageProvider();
  const useCases = makeRecipeUseCases(repo, { storageProvider: storage });

  const image = await sampleImage();
  const images = Array.from({ length: 9 }, () => image);

  await assert.rejects(
    () =>
      useCases.createRecipeWithImages(1, {
        recipe: sampleRecipeInput(),
        images,
      }),
    /up to 8 images/,
  );
});

test("updateRecipeWithImages blocks non-owner", async () => {
  const repo = new FakeRecipeRepository();
  const storage = new InMemoryStorageProvider();
  const useCases = makeRecipeUseCases(repo, { storageProvider: storage });

  const recipe = await repo.create(sampleRecipeInput(), 99);
  const result = await useCases.updateRecipeWithImages(1, recipe.id, {
    recipe: sampleRecipeInput(),
    newImages: [],
  });

  assert.equal(result.forbidden, true);
  assert.equal(result.recipe, null);
});

test("createRecipeWithImages stores image and exposes retrievable asset keys", async () => {
  const repo = new FakeRecipeRepository();
  const storage = new InMemoryStorageProvider();
  const useCases = makeRecipeUseCases(repo, { storageProvider: storage });

  const image = await sampleImage();
  const recipe = await useCases.createRecipeWithImages(1, {
    recipe: sampleRecipeInput(),
    images: [image],
    primaryImageIndex: 0,
  });

  assert.ok(recipe.images && recipe.images.length === 1);
  const imageId = recipe.images?.[0]?.id;
  assert.ok(imageId);

  const asset = await useCases.getRecipeImageAssetById(imageId as number);
  assert.ok(asset);
  assert.ok(asset?.storageKey.includes("recipes/"));
  assert.ok(asset?.thumbnailKey.includes("recipes/"));
});

test("createRecipeWithImages rolls back recipe and storage when reload fails after create", async () => {
  const repo = new MissingAfterCreateRecipeRepository();
  const storage = new InMemoryStorageProvider();
  const useCases = makeRecipeUseCases(repo, { storageProvider: storage });
  const image = await sampleImage();

  await assert.rejects(
    () =>
      useCases.createRecipeWithImages(1, {
        recipe: sampleRecipeInput(),
        images: [image],
        primaryImageIndex: 0,
      }),
    /Recipe not found after create/,
  );

  assert.equal(await repo.getById(1), null);
  assert.equal(storage.objects.size, 0);
});

test("createRecipeWithImages rolls back recipe and storage when image persistence fails", async () => {
  const repo = new FakeRecipeRepository();
  const storage = new FailOnNthPutStorageProvider(2);
  const useCases = makeRecipeUseCases(repo, { storageProvider: storage });
  const image = await sampleImage();

  await assert.rejects(
    () =>
      useCases.createRecipeWithImages(1, {
        recipe: sampleRecipeInput(),
        images: [image],
        primaryImageIndex: 0,
      }),
    /Simulated storage write failure/,
  );

  assert.equal(await repo.getById(1), null);
  assert.equal(storage.objects.size, 0);
});

test("updateRecipeWithImages reload uses viewer context for private/family recipes", async () => {
  const repo = new TrackingRecipeRepository();
  const storage = new InMemoryStorageProvider();
  const useCases = makeRecipeUseCases(repo, { storageProvider: storage });

  const recipe = await repo.create(sampleRecipeInput(), 42);

  const result = await useCases.updateRecipeWithImages(42, recipe.id, {
    recipe: { ...sampleRecipeInput(), visibility: "family", familyIds: [1] },
    newImages: [],
  });

  assert.equal(result.forbidden, false);
  assert.ok(result.recipe);
  assert.equal(repo.lastGetByIdOptions?.viewerUserId, 42);
  assert.equal(repo.lastGetByIdOptions?.includeImages, true);
  assert.equal(repo.lastGetByIdOptions?.includePrimaryImage, true);
});
