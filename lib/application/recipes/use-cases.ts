import { randomUUID } from "node:crypto";
import type { CreateRecipeInput, Recipe, RecipeListItem } from "@/lib/domain/recipe";
import type {
  GetRecipeByIdOptions,
  ListRecipeOptions,
  RecipeRepository,
} from "@/lib/domain/recipe-repository";
import {
  assertSupportedImageMimeType,
  assertSupportedImageSize,
  resizeRecipeImage,
} from "@/lib/infrastructure/images/image-service";
import type { ImageStorageProvider } from "@/lib/infrastructure/images/image-storage-provider";
import { buildImageStorageProvider } from "@/lib/infrastructure/images/storage-factory";

export type UploadedRecipeImage = {
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  buffer: Buffer;
};

type CreateRecipeWithImagesInput = {
  recipe: CreateRecipeInput;
  images: UploadedRecipeImage[];
  primaryImageIndex?: number | null;
};

type UpdateRecipeWithImagesInput = {
  recipe: CreateRecipeInput;
  newImages: UploadedRecipeImage[];
  primaryImageId?: number | null;
  primaryImageIndex?: number | null;
};

export type RecipeUseCases = {
  listRecipes: (options?: ListRecipeOptions) => Promise<RecipeListItem[]>;
  getRecipeById: (id: number, options?: GetRecipeByIdOptions) => Promise<Recipe | null>;
  createRecipe: (userId: number, input: CreateRecipeInput) => Promise<Recipe>;
  createRecipeWithImages: (userId: number, input: CreateRecipeWithImagesInput) => Promise<Recipe>;
  updateRecipe: (
    userId: number,
    id: number,
    input: CreateRecipeInput,
  ) => Promise<{ recipe: Recipe | null; forbidden: boolean }>;
  updateRecipeWithImages: (
    userId: number,
    id: number,
    input: UpdateRecipeWithImagesInput,
  ) => Promise<{ recipe: Recipe | null; forbidden: boolean }>;
  getRecipeImageAssetById: (imageId: number) => Promise<{ id: number; storageKey: string; thumbnailKey: string } | null>;
  deleteRecipeImage: (
    userId: number,
    recipeId: number,
    imageId: number,
  ) => Promise<{ deleted: boolean; forbidden: boolean; notFound: boolean; promotedPrimaryImageId: number | null }>;
  deleteRecipe: (userId: number, id: number) => Promise<{ deleted: boolean; forbidden: boolean }>;
};

type RecipeUseCaseDeps = {
  storageProvider?: ImageStorageProvider;
};

export function makeRecipeUseCases(
  recipeRepository: RecipeRepository,
  deps?: RecipeUseCaseDeps,
): RecipeUseCases {
  const storageProvider = deps?.storageProvider ?? buildImageStorageProvider();

  async function persistNewImages(
    recipeId: number,
    newImages: UploadedRecipeImage[],
    primaryImageIndex?: number | null,
  ): Promise<{ createdImageIds: number[]; primaryImageId: number | null }> {
    if (newImages.length === 0) {
      return { createdImageIds: [], primaryImageId: null };
    }

    const existingCount = await recipeRepository.countImagesByRecipeId(recipeId);
    if (existingCount + newImages.length > 8) {
      throw new Error("A recipe supports up to 8 images.");
    }

    if (
      primaryImageIndex != null &&
      (!Number.isInteger(primaryImageIndex) ||
        primaryImageIndex < 0 ||
        primaryImageIndex >= newImages.length)
    ) {
      throw new Error("primaryImageIndex must reference one uploaded image.");
    }

    const existingPrimary = await recipeRepository.getPrimaryImageByRecipeId(recipeId);
    const createdImageIds: number[] = [];

    for (let index = 0; index < newImages.length; index += 1) {
      const image = newImages[index];
      assertSupportedImageMimeType(image.mimeType);
      assertSupportedImageSize(image.sizeBytes);

      const resized = await resizeRecipeImage(image.buffer);
      const imageKeyToken = randomUUID();
      const fullKey = `recipes/${recipeId}/img_${imageKeyToken}.jpg`;
      const thumbnailKey = `recipes/${recipeId}/thumb_${imageKeyToken}.jpg`;
      const shouldSetPrimary =
        primaryImageIndex != null
          ? primaryImageIndex === index
          : existingCount === 0 && index === 0 && !existingPrimary;

      await storageProvider.putObject({
        key: fullKey,
        buffer: resized.fullBuffer,
        contentType: resized.mimeType,
      });
      await storageProvider.putObject({
        key: thumbnailKey,
        buffer: resized.thumbnailBuffer,
        contentType: resized.mimeType,
      });

      const created = await recipeRepository.addImage(recipeId, {
        originalFilename: image.originalFilename,
        mimeType: resized.mimeType,
        sizeBytes: image.sizeBytes,
        storageKey: fullKey,
        thumbnailKey,
        width: resized.width,
        height: resized.height,
        position: existingCount + index + 1,
        isPrimary: shouldSetPrimary,
      });

      createdImageIds.push(created.id);
    }

    const primaryImageId =
      primaryImageIndex != null ? (createdImageIds[primaryImageIndex] ?? null) : null;

    return { createdImageIds, primaryImageId };
  }

  return {
    async listRecipes(options) {
      return recipeRepository.list(options);
    },

    async getRecipeById(id: number, options?: GetRecipeByIdOptions) {
      return recipeRepository.getById(id, options);
    },

    async createRecipe(userId: number, input: CreateRecipeInput) {
      return recipeRepository.create(input, userId);
    },

    async createRecipeWithImages(userId: number, input: CreateRecipeWithImagesInput) {
      if (input.images.length > 8) {
        throw new Error("A recipe supports up to 8 images.");
      }

      const recipe = await recipeRepository.create(input.recipe, userId);
      await persistNewImages(recipe.id, input.images, input.primaryImageIndex);

      const withImages = await recipeRepository.getById(recipe.id, {
        includePrimaryImage: true,
        includeImages: true,
      });

      if (!withImages) {
        throw new Error("Recipe not found after create");
      }

      return withImages;
    },

    async updateRecipe(userId: number, id: number, input: CreateRecipeInput) {
      const ownerId = await recipeRepository.getOwnerById(id);

      if (!ownerId) {
        return { recipe: null, forbidden: false };
      }

      if (ownerId !== userId) {
        return { recipe: null, forbidden: true };
      }

      const recipe = await recipeRepository.update(id, input);
      return { recipe, forbidden: false };
    },

    async updateRecipeWithImages(userId: number, id: number, input: UpdateRecipeWithImagesInput) {
      const ownerId = await recipeRepository.getOwnerById(id);

      if (!ownerId) {
        return { recipe: null, forbidden: false };
      }

      if (ownerId !== userId) {
        return { recipe: null, forbidden: true };
      }

      const updatedRecipe = await recipeRepository.update(id, input.recipe);
      if (!updatedRecipe) {
        return { recipe: null, forbidden: false };
      }

      const { primaryImageId: createdPrimaryImageId } = await persistNewImages(
        id,
        input.newImages,
        input.primaryImageIndex,
      );
      if (input.primaryImageId != null) {
        const switched = await recipeRepository.setPrimaryImage(id, input.primaryImageId);
        if (!switched) {
          throw new Error("primaryImageId does not belong to this recipe");
        }
      } else if (createdPrimaryImageId != null) {
        await recipeRepository.setPrimaryImage(id, createdPrimaryImageId);
      }

      const recipe = await recipeRepository.getById(id, {
        includePrimaryImage: true,
        includeImages: true,
      });
      return { recipe, forbidden: false };
    },

    async getRecipeImageAssetById(imageId: number) {
      const image = await recipeRepository.getImageById(imageId);
      if (!image) {
        return null;
      }

      return {
        id: image.id,
        storageKey: image.storageKey,
        thumbnailKey: image.thumbnailKey,
      };
    },

    async deleteRecipeImage(userId: number, recipeId: number, imageId: number) {
      const ownerId = await recipeRepository.getOwnerById(recipeId);

      if (!ownerId) {
        return { deleted: false, forbidden: false, notFound: true, promotedPrimaryImageId: null };
      }

      if (ownerId !== userId) {
        return { deleted: false, forbidden: true, notFound: false, promotedPrimaryImageId: null };
      }

      const result = await recipeRepository.deleteImageById(recipeId, imageId);
      if (!result.deleted || !result.deletedImage) {
        return { deleted: false, forbidden: false, notFound: true, promotedPrimaryImageId: null };
      }

      await Promise.all([
        storageProvider.deleteObject(result.deletedImage.storageKey),
        storageProvider.deleteObject(result.deletedImage.thumbnailKey),
      ]);

      return {
        deleted: true,
        forbidden: false,
        notFound: false,
        promotedPrimaryImageId: result.promotedPrimaryImageId,
      };
    },

    async deleteRecipe(userId: number, id: number) {
      const ownerId = await recipeRepository.getOwnerById(id);

      if (!ownerId) {
        return { deleted: false, forbidden: false };
      }

      if (ownerId !== userId) {
        return { deleted: false, forbidden: true };
      }

      const deleted = await recipeRepository.delete(id);
      return { deleted, forbidden: false };
    },
  };
}
