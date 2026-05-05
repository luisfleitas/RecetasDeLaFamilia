import type { RecipeMediaCarouselItem } from "@/lib/application/recipes/recipe-media-groups";

type RecipeImageRef = {
  id: number;
  thumbnailUrl: string;
  fullUrl: string;
};

export type HomeNavigationRecipe = {
  id: number;
  title: string;
  description?: string | null;
  createdByUserId: number;
  createdAt: string;
  visibility: "public" | "family" | "private";
  families: Array<{ id: number; name: string }>;
  primaryImage?: RecipeImageRef | null;
  images?: RecipeImageRef[];
};

export type HomeNavigationFamily = {
  id: number;
  name: string;
  role?: string;
  joinedAt?: string;
};

export type HomeSidebarFamily = {
  id: number;
  name: string;
  canEdit: boolean;
  editHref: string;
};

export type HomeSidebarRecipe = {
  id: number;
  title: string;
  canEdit: boolean;
  href: string;
  editHref: string;
};

export type FeaturedRecipeSlide = {
  id: number;
  title: string;
  description: string | null;
  href: string;
  imageUrl: string;
  mediaItems: RecipeMediaCarouselItem[];
};

export type HomeNavigationViewModel = {
  families: HomeSidebarFamily[];
  recipes: HomeSidebarRecipe[];
  familyCreateHref: string;
  recipeCreateHref: string;
  familiesMoreHref: string;
  recipesMoreHref: string;
};

export type RecipeGroupForDisplay = {
  type: "public" | "family" | "private";
  label: string;
  recipes: unknown[];
};

export type HomeRecipeVisibilityTabGroup<TRecipe extends HomeNavigationRecipe = HomeNavigationRecipe> = {
  id: string;
  label: string;
  type: "public" | "family" | "private";
  recipes: TRecipe[];
};

export type HomeRecipeMediaInput = {
  title: string;
  images?: RecipeImageRef[];
  primaryImage?: RecipeImageRef | null;
};

export function buildHomeNavigationViewModel(input: {
  userId: number;
  recipes: HomeNavigationRecipe[];
  families: HomeNavigationFamily[];
}): HomeNavigationViewModel {
  const ownedRecipes = input.recipes
    .filter((recipe) => recipe.createdByUserId === input.userId)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, 6)
    .map((recipe) => ({
      id: recipe.id,
      title: recipe.title,
      canEdit: recipe.createdByUserId === input.userId,
      href: `/recipes/${recipe.id}`,
      editHref: `/recipes/${recipe.id}/edit`,
    }));

  return {
    families: input.families.slice(0, 6).map((family) => ({
      id: family.id,
      name: family.name,
      canEdit: family.role === "admin",
      editHref: "/account/families",
    })),
    recipes: ownedRecipes,
    familyCreateHref: "/account/families",
    recipeCreateHref: "/recipes/add",
    familiesMoreHref: "/account/families",
    recipesMoreHref: "#home-recipe-groups",
  };
}

export function buildFeaturedRecipeSlides(recipes: HomeNavigationRecipe[], limit = 6): FeaturedRecipeSlide[] {
  return [...recipes]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .flatMap((recipe) => {
      const mediaItems = buildHomeRecipeMediaCarouselItems(recipe);
      const firstMediaItem = mediaItems[0];
      if (!firstMediaItem) {
        return [];
      }

      return {
        id: recipe.id,
        title: recipe.title,
        description: recipe.description ?? null,
        href: `/recipes/${recipe.id}`,
        imageUrl: firstMediaItem.thumbnailUrl,
        mediaItems,
      };
    })
    .slice(0, limit);
}

export function buildHomeRecipeMediaCarouselItems(recipe: HomeRecipeMediaInput): RecipeMediaCarouselItem[] {
  let recipeImageCount = 0;
  let sourcePageCount = 0;
  const imageRefs = getHomeRecipeDisplayMediaRefs(recipe);

  return imageRefs.map((image) => {
    if (image.id < 0) {
      sourcePageCount += 1;
      const sourceDocumentId = Math.abs(image.id);
      const label = `${recipe.title} imported source page ${sourcePageCount}`;
      return {
        id: `source-document-${sourceDocumentId}`,
        type: "source-document",
        label,
        thumbnailUrl: image.thumbnailUrl,
        fullUrl: image.fullUrl,
        accessibleLabel: `Open imported source page ${label}`,
        isPrimary: false,
      };
    }

    recipeImageCount += 1;
    const label = `${recipe.title} image ${recipeImageCount}`;
    return {
      id: `recipe-image-${image.id}`,
      type: "recipe-image",
      label,
      thumbnailUrl: image.thumbnailUrl,
      fullUrl: image.fullUrl,
      accessibleLabel: `Open recipe image ${label}`,
      isPrimary: image.id === recipe.primaryImage?.id || imageRefs.length === 1,
    };
  });
}

export function getHomeRecipeDisplayMediaRefs(recipe: HomeRecipeMediaInput): RecipeImageRef[] {
  if (recipe.images && recipe.images.length > 0) {
    return recipe.images;
  }

  return recipe.primaryImage ? [recipe.primaryImage] : [];
}

export function getRecipeGroupDisplayLabel(group: RecipeGroupForDisplay) {
  if (group.type === "public") {
    return "Public recipes";
  }

  if (group.type === "private") {
    return "Just for me";
  }

  return group.label.replace(/^Family:\s*/i, "");
}

export function buildRecipeVisibilityTabGroups<TRecipe extends HomeNavigationRecipe>(
  recipes: TRecipe[],
  labels: {
    locale: string;
    publicRecipesLabel: string;
    privateRecipesLabel: string;
    familyVisibilityPrefix: string;
    familyUnassignedLabel: string;
  },
): HomeRecipeVisibilityTabGroup<TRecipe>[] {
  const publicRecipes = recipes.filter((recipe) => recipe.visibility === "public");
  const privateRecipes = recipes.filter((recipe) => recipe.visibility === "private");
  const familyGroupsMap = new Map<string, HomeRecipeVisibilityTabGroup<TRecipe>>();

  for (const recipe of recipes) {
    if (recipe.visibility !== "family") {
      continue;
    }

    if (recipe.families.length === 0) {
      const unassignedGroupId = "family-unassigned";
      const existingGroup = familyGroupsMap.get(unassignedGroupId);
      if (existingGroup) {
        existingGroup.recipes.push(recipe);
      } else {
        familyGroupsMap.set(unassignedGroupId, {
          id: unassignedGroupId,
          label: `${labels.familyVisibilityPrefix}: ${labels.familyUnassignedLabel}`,
          type: "family",
          recipes: [recipe],
        });
      }
      continue;
    }

    for (const family of recipe.families) {
      const familyGroupId = `family-${family.id}`;
      const existingGroup = familyGroupsMap.get(familyGroupId);
      if (existingGroup) {
        existingGroup.recipes.push(recipe);
      } else {
        familyGroupsMap.set(familyGroupId, {
          id: familyGroupId,
          label: `${labels.familyVisibilityPrefix}: ${family.name}`,
          type: "family",
          recipes: [recipe],
        });
      }
    }
  }

  const familyGroups = Array.from(familyGroupsMap.values()).sort((a, b) => a.label.localeCompare(b.label, labels.locale));

  return [
    { id: "public", label: labels.publicRecipesLabel, type: "public", recipes: publicRecipes },
    ...familyGroups.map((group) => ({
      ...group,
      label: getRecipeGroupDisplayLabel(group),
    })),
    { id: "private", label: labels.privateRecipesLabel, type: "private", recipes: privateRecipes },
  ];
}
