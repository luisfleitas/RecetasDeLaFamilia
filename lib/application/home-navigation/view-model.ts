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
  editHref: string;
};

export type HomeSidebarRecipe = {
  id: number;
  title: string;
  href: string;
  editHref: string;
};

export type FeaturedRecipeSlide = {
  id: number;
  title: string;
  description: string | null;
  href: string;
  imageUrl: string | null;
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
      href: `/recipes/${recipe.id}`,
      editHref: `/recipes/${recipe.id}/edit`,
    }));

  return {
    families: input.families.slice(0, 6).map((family) => ({
      id: family.id,
      name: family.name,
      editHref: "/account/families",
    })),
    recipes: ownedRecipes,
    familyCreateHref: "/account/families",
    recipeCreateHref: "/recipes/new",
    familiesMoreHref: "/account/families",
    recipesMoreHref: "#home-recipe-groups",
  };
}

export function buildFeaturedRecipeSlides(recipes: HomeNavigationRecipe[], limit = 6): FeaturedRecipeSlide[] {
  return [...recipes]
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
    .slice(0, limit)
    .map((recipe) => {
      const firstImage = recipe.images?.[0] ?? recipe.primaryImage ?? null;
      return {
        id: recipe.id,
        title: recipe.title,
        description: recipe.description ?? null,
        href: `/recipes/${recipe.id}`,
        imageUrl: firstImage?.thumbnailUrl ?? null,
      };
    });
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
