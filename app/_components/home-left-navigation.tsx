"use client";

import Link from "next/link";
import { useState } from "react";
import type { HomeSidebarFamily, HomeSidebarRecipe } from "@/lib/application/home-navigation/view-model";

type HomeLeftNavigationProps = {
  families: HomeSidebarFamily[];
  recipes: HomeSidebarRecipe[];
  familyCreateHref: string;
  recipeCreateHref: string;
  familiesMoreHref: string;
  recipesMoreHref: string;
  labels: {
    families: string;
    recipes: string;
    addFamily: string;
    addRecipe: string;
    edit: string;
    more: string;
    expandNavigation: string;
    collapseNavigation: string;
    noFamilies: string;
    noOwnedRecipes: string;
  };
};

export default function HomeLeftNavigation({
  families,
  recipes,
  familyCreateHref,
  recipeCreateHref,
  familiesMoreHref,
  recipesMoreHref,
  labels,
}: HomeLeftNavigationProps) {
  const [isOpen, setIsOpen] = useState(false);
  const railVisibilityClass = isOpen ? "hidden lg:grid" : "inline-flex lg:grid";

  return (
    <aside id="home-left-navigation" className="relative block">
      <nav
        id="home-left-navigation-rail"
        aria-label="Home shortcuts"
        className={`relative z-30 ${railVisibilityClass} justify-items-center gap-3 rounded-2xl border border-[var(--brand-line-warm)] bg-[var(--brand-cream-100)] p-2 shadow-[var(--brand-shadow-card)]`}
      >
        <button
          id="home-left-navigation-toggle-btn"
          type="button"
          aria-expanded={isOpen}
          aria-controls="home-left-navigation-drawer"
          aria-label={isOpen ? labels.collapseNavigation : labels.expandNavigation}
          onClick={() => setIsOpen((current) => !current)}
          className="grid h-10 w-10 place-items-center rounded-full bg-[var(--brand-orange-500)] text-lg font-black text-[var(--brand-cream-50)] transition hover:-translate-y-0.5 hover:bg-[var(--brand-orange-700)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
        >
          {isOpen ? "‹" : "☰"}
        </button>
      </nav>

      {isOpen ? (
        <div
          id="home-left-navigation-drawer"
          className="fixed inset-x-4 top-24 z-20 max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border border-[var(--brand-line-warm)] bg-[var(--brand-cream-100)] p-4 shadow-[var(--brand-shadow-panel)] sm:left-5 sm:right-auto sm:w-72 lg:absolute lg:left-14 lg:right-auto lg:top-0 lg:max-h-none lg:w-64 lg:overflow-visible"
        >
          <section id="home-left-navigation-families-section" className="space-y-3">
            <div id="home-left-navigation-families-header" className="flex items-center justify-between gap-2">
              <div id="home-left-navigation-families-title-row" className="flex items-center gap-2">
                <button
                  id="home-left-navigation-drawer-close-btn"
                  type="button"
                  aria-label={labels.collapseNavigation}
                  onClick={() => setIsOpen(false)}
                  className="grid h-10 w-10 place-items-center rounded-full border border-[var(--brand-line-warm)] bg-[var(--brand-cream-50)] text-lg font-black text-[var(--brand-orange-700)] transition hover:-translate-y-0.5 hover:bg-[var(--brand-cream-200)] hover:text-[var(--brand-brown-900)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                >
                  {"<"}
                </button>
                <h2 id="home-left-navigation-families-title" className="text-xs font-black uppercase text-[var(--brand-orange-700)]">
                  {labels.families}
                </h2>
              </div>
              <Link
                id="home-left-navigation-family-create-link"
                href={familyCreateHref}
                aria-label={labels.addFamily}
                className="grid h-10 w-10 place-items-center rounded-full bg-[var(--brand-orange-500)] font-black text-[var(--brand-cream-50)] transition hover:bg-[var(--brand-orange-700)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
              >
                +
              </Link>
            </div>
            <div id="home-left-navigation-families-list" className="grid gap-2">
              {families.length === 0 ? (
                <p id="home-left-navigation-families-empty" className="text-sm text-[var(--brand-brown-700)]">
                  {labels.noFamilies}
                </p>
              ) : (
                families.map((family) => (
                  <div
                    id={`home-left-navigation-family-item-${family.id}`}
                    key={family.id}
                    className="rounded-xl border border-[var(--brand-line-warm)] bg-[var(--brand-cream-50)] p-2"
                  >
                    <p id={`home-left-navigation-family-name-${family.id}`} className="truncate text-sm font-bold">
                      {family.name}
                    </p>
                    {family.canEdit ? (
                      <Link
                        id={`home-left-navigation-family-edit-link-${family.id}`}
                        href={family.editHref}
                        className="text-xs font-bold text-[var(--brand-orange-700)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                      >
                        {labels.edit}
                      </Link>
                    ) : null}
                  </div>
                ))
              )}
              <Link id="home-left-navigation-families-more-link" href={familiesMoreHref} className="text-xs font-black text-[var(--brand-sage-500)] hover:underline">
                {labels.more}
              </Link>
            </div>
          </section>

          <section id="home-left-navigation-recipes-section" className="mt-5 space-y-3">
            <div id="home-left-navigation-recipes-header" className="flex items-center justify-between gap-2">
              <h2 id="home-left-navigation-recipes-title" className="text-xs font-black uppercase text-[var(--brand-orange-700)]">
                {labels.recipes}
              </h2>
              <Link
                id="home-left-navigation-recipe-create-link"
                href={recipeCreateHref}
                aria-label={labels.addRecipe}
                className="grid h-10 w-10 place-items-center rounded-full bg-[var(--brand-orange-500)] font-black text-[var(--brand-cream-50)] transition hover:bg-[var(--brand-orange-700)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
              >
                +
              </Link>
            </div>
            <div id="home-left-navigation-recipes-list" className="grid gap-2">
              {recipes.length === 0 ? (
                <p id="home-left-navigation-recipes-empty" className="text-sm text-[var(--brand-brown-700)]">
                  {labels.noOwnedRecipes}
                </p>
              ) : (
                recipes.map((recipe) => (
                  <div
                    id={`home-left-navigation-recipe-item-${recipe.id}`}
                    key={recipe.id}
                    className="rounded-xl border border-[var(--brand-line-warm)] bg-[var(--brand-cream-50)] p-2"
                  >
                    <Link
                      id={`home-left-navigation-recipe-link-${recipe.id}`}
                      href={recipe.href}
                      className="block truncate text-sm font-bold hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                    >
                      {recipe.title}
                    </Link>
                    {recipe.canEdit ? (
                      <Link
                        id={`home-left-navigation-recipe-edit-link-${recipe.id}`}
                        href={recipe.editHref}
                        className="text-xs font-bold text-[var(--brand-orange-700)] hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus)]"
                      >
                        {labels.edit}
                      </Link>
                    ) : null}
                  </div>
                ))
              )}
              <Link id="home-left-navigation-recipes-more-link" href={recipesMoreHref} className="text-xs font-black text-[var(--brand-sage-500)] hover:underline">
                {labels.more}
              </Link>
            </div>
          </section>
        </div>
      ) : null}
    </aside>
  );
}
