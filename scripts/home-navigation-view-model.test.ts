import assert from "node:assert/strict";
import test from "node:test";
import {
  buildFeaturedRecipeSlides,
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
    { id: 20, name: "Hernandez", editHref: "/account/families" },
    { id: 21, name: "Abuela Rosa", editHref: "/account/families" },
  ]);
  assert.equal(model.familyCreateHref, "/account/families");
  assert.equal(model.familiesMoreHref, "/account/families");
  assert.deepEqual(model.recipes, [
    { id: 3, title: "Private Sofrito", href: "/recipes/3", editHref: "/recipes/3/edit" },
    { id: 2, title: "Family Sancocho", href: "/recipes/2", editHref: "/recipes/2/edit" },
    { id: 1, title: "Public Arepas", href: "/recipes/1", editHref: "/recipes/1/edit" },
  ]);
  assert.equal(model.recipeCreateHref, "/recipes/new");
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
