import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFeaturedRecipeSlides,
  buildHomeRecipeMediaCarouselItems,
  buildRecipeVisibilityTabGroups,
  buildHomeNavigationViewModel,
  getRecipeGroupDisplayLabel,
} from "../lib/application/home-navigation/view-model";

const recipes = [
  {
    id: 1,
    title: "Public Arepas",
    description: "Crisp and warm.",
    createdByUserId: 7,
    createdAt: "2026-01-02T00:00:00.000Z",
    visibility: "public" as const,
    families: [],
    images: [{ id: 11, thumbnailUrl: "/public-arepas.jpg", fullUrl: "/public-arepas-large.jpg" }],
    primaryImage: null,
  },
  {
    id: 2,
    title: "Family Sancocho",
    description: null,
    createdByUserId: 7,
    createdAt: "2026-01-03T00:00:00.000Z",
    visibility: "family" as const,
    families: [{ id: 20, name: "Hernandez" }],
    images: [],
    primaryImage: { id: 22, thumbnailUrl: "/sancocho.jpg", fullUrl: "/sancocho-large.jpg" },
  },
  {
    id: 3,
    title: "Private Sofrito",
    description: "Base for everything.",
    createdByUserId: 7,
    createdAt: "2026-01-04T00:00:00.000Z",
    visibility: "private" as const,
    families: [],
    images: [],
    primaryImage: null,
  },
  {
    id: 4,
    title: "Other User Recipe",
    description: null,
    createdByUserId: 8,
    createdAt: "2026-01-05T00:00:00.000Z",
    visibility: "public" as const,
    families: [],
    images: [],
    primaryImage: null,
  },
];

const families = [
  { id: 20, name: "Hernandez", role: "admin", joinedAt: "2026-01-01T00:00:00.000Z" },
  { id: 21, name: "Abuela Rosa", role: "member", joinedAt: "2026-01-02T00:00:00.000Z" },
];

test("limits sidebar families and owned recipes to six and prepares approved routes", () => {
  const model = buildHomeNavigationViewModel({
    userId: 7,
    recipes,
    families,
  });

  assert.deepEqual(model.families, [
    { id: 20, name: "Hernandez", canEdit: true, editHref: "/account/families" },
    { id: 21, name: "Abuela Rosa", canEdit: false, editHref: "/account/families" },
  ]);
  assert.equal(model.familyCreateHref, "/account/families");
  assert.equal(model.familiesMoreHref, "/account/families");
  assert.deepEqual(model.recipes, [
    { id: 3, title: "Private Sofrito", canEdit: true, href: "/recipes/3", editHref: "/recipes/3/edit" },
    { id: 2, title: "Family Sancocho", canEdit: true, href: "/recipes/2", editHref: "/recipes/2/edit" },
    { id: 1, title: "Public Arepas", canEdit: true, href: "/recipes/1", editHref: "/recipes/1/edit" },
  ]);
  assert.equal(model.recipeCreateHref, "/recipes/add");
  assert.equal(model.recipesMoreHref, "#home-recipe-groups");
});

test("builds featured slides from most recent visible recipes", () => {
  const slides = buildFeaturedRecipeSlides(recipes, 3);

  assert.deepEqual(slides, [
    {
      id: 4,
      title: "Other User Recipe",
      description: null,
      href: "/recipes/4",
      imageUrl: null,
    },
    {
      id: 3,
      title: "Private Sofrito",
      description: "Base for everything.",
      href: "/recipes/3",
      imageUrl: null,
    },
    {
      id: 2,
      title: "Family Sancocho",
      description: null,
      href: "/recipes/2",
      imageUrl: "/sancocho.jpg",
    },
  ]);
});

test("returns approved display labels for recipe groups", () => {
  assert.equal(getRecipeGroupDisplayLabel({ type: "public", label: "Public", recipes: [] }), "Public recipes");
  assert.equal(getRecipeGroupDisplayLabel({ type: "family", label: "Family: Hernandez", recipes: [] }), "Hernandez");
  assert.equal(getRecipeGroupDisplayLabel({ type: "private", label: "Private", recipes: [] }), "Just for me");
});

test("builds recipe visibility groups outside the page layout", () => {
  const groups = buildRecipeVisibilityTabGroups(recipes, {
    locale: "en",
    publicRecipesLabel: "Public recipes",
    privateRecipesLabel: "Just for me",
    familyVisibilityPrefix: "Family",
    familyUnassignedLabel: "Unassigned",
  });

  assert.deepEqual(
    groups.map((group) => ({
      id: group.id,
      label: group.label,
      type: group.type,
      recipeIds: group.recipes.map((recipe) => recipe.id),
    })),
    [
      { id: "public", label: "Public recipes", type: "public", recipeIds: [1, 4] },
      { id: "family-20", label: "Hernandez", type: "family", recipeIds: [2] },
      { id: "private", label: "Just for me", type: "private", recipeIds: [3] },
    ],
  );
});

test("builds home card carousel items from recipe images and visible imported source pages", () => {
  const items = buildHomeRecipeMediaCarouselItems({
    id: 9,
    title: "Media Recipe",
    description: null,
    createdByUserId: 7,
    createdAt: "2026-01-06T00:00:00.000Z",
    visibility: "public",
    families: [],
    images: [
      { id: 14, thumbnailUrl: "/recipe-photo-thumb.jpg", fullUrl: "/recipe-photo-full.jpg" },
      { id: -41, thumbnailUrl: "/source-page.jpg", fullUrl: "/source-page.jpg" },
    ],
  });

  assert.deepEqual(items, [
    {
      id: "recipe-image-14",
      type: "recipe-image",
      label: "Media Recipe image 1",
      thumbnailUrl: "/recipe-photo-thumb.jpg",
      fullUrl: "/recipe-photo-full.jpg",
      accessibleLabel: "Open recipe image Media Recipe image 1",
      isPrimary: false,
    },
    {
      id: "source-document-41",
      type: "source-document",
      label: "Media Recipe imported source page 1",
      thumbnailUrl: "/source-page.jpg",
      fullUrl: "/source-page.jpg",
      accessibleLabel: "Open imported source page Media Recipe imported source page 1",
      isPrimary: false,
    },
  ]);
});
