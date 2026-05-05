import assert from "node:assert/strict";
import test from "node:test";
import { loadRecipeListForPage } from "../lib/application/recipes/page-recipe-list-loader";
import type { RecipeListItem } from "../lib/domain/recipe";

const publicRecipe: RecipeListItem = {
  id: 1,
  title: "Simple Tomato Pasta",
  visibility: "public",
  createdByUserId: 7,
  createdAt: new Date("2026-05-01T12:00:00.000Z"),
  families: [],
  primaryImage: null,
};

test("loads page recipes directly from use cases and appends visible source images", async () => {
  const result = await loadRecipeListForPage({
    viewerUserId: 7,
    recipeUseCases: {
      async listRecipes(viewerUserId, options) {
        assert.equal(viewerUserId, 7);
        assert.deepEqual(options, { includePrimaryImage: true, includeImages: true });
        return [publicRecipe];
      },
    },
    async listVisibleRecipeSourceImages(recipes, viewerUserId) {
      assert.deepEqual(recipes, [publicRecipe]);
      assert.equal(viewerUserId, 7);
      return new Map([
        [
          1,
          [
            {
              id: -10,
              sourceDocumentId: 10,
              fullUrl: "/api/recipes/1/source-documents/10/file",
              thumbnailUrl: "/api/recipes/1/source-documents/10/file",
              isPrimary: false,
              mediaReference: "source-document",
            },
          ],
        ],
      ]);
    },
  });

  assert.deepEqual(result, {
    recipes: [
      {
        ...publicRecipe,
        createdAt: "2026-05-01T12:00:00.000Z",
        images: [
          {
            id: -10,
            sourceDocumentId: 10,
            fullUrl: "/api/recipes/1/source-documents/10/file",
            thumbnailUrl: "/api/recipes/1/source-documents/10/file",
            isPrimary: false,
            mediaReference: "source-document",
          },
        ],
      },
    ],
  });
});
