"use client";

import Link from "next/link";
import { type KeyboardEvent, useMemo, useRef, useState } from "react";
import RecipeCardCarousel from "@/app/_components/recipe-card-carousel";

type PrimaryImageRef = {
  id: number;
  thumbnailUrl: string;
  fullUrl: string;
};

type RecipeListItem = {
  id: number;
  title: string;
  createdAt: string;
  visibility: "public" | "private" | "family";
  families: Array<{ id: number; name: string }>;
  primaryImage?: PrimaryImageRef | null;
  images?: PrimaryImageRef[];
};

export type RecipeVisibilityTabGroup = {
  id: string;
  label: string;
  type: "public" | "family" | "private";
  recipes: RecipeListItem[];
};

type RecipeVisibilityTabsProps = {
  groups: RecipeVisibilityTabGroup[];
};

function getRecipeVisibilitySummary(recipe: RecipeListItem) {
  if (recipe.visibility === "public") {
    return "Public";
  }

  if (recipe.visibility === "private") {
    return "Private";
  }

  return `Shared with ${recipe.families.length} ${recipe.families.length === 1 ? "family" : "families"}`;
}

export default function RecipeVisibilityTabs({ groups }: RecipeVisibilityTabsProps) {
  const firstTabId = useMemo(() => {
    const firstNonEmpty = groups.find((group) => group.recipes.length > 0);
    return firstNonEmpty?.id ?? groups[0]?.id ?? "";
  }, [groups]);
  const [activeGroupId, setActiveGroupId] = useState(firstTabId);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeGroup = groups.find((group) => group.id === activeGroupId) ?? groups[0];

  function focusTabByIndex(nextIndex: number) {
    const safeIndex = (nextIndex + groups.length) % groups.length;
    const nextGroup = groups[safeIndex];
    if (!nextGroup) {
      return;
    }
    setActiveGroupId(nextGroup.id);
    tabRefs.current[safeIndex]?.focus();
  }

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      focusTabByIndex(index + 1);
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      focusTabByIndex(index - 1);
      return;
    }

    if (event.key === "Home") {
      event.preventDefault();
      focusTabByIndex(0);
      return;
    }

    if (event.key === "End") {
      event.preventDefault();
      focusTabByIndex(groups.length - 1);
    }
  }

  return (
    <article id="home-visibility-tabs-card" className="surface-card p-4 sm:p-5">
      <div
        id="home-visibility-tabs-list"
        role="tablist"
        aria-label="Recipe visibility groups"
        className="sticky top-2 z-10 -mx-1 flex gap-3 overflow-x-auto border-b border-[var(--color-border)] bg-[var(--color-surface)] px-1 pb-0.5 pt-0.5"
      >
        {groups.map((group, index) => {
          const isActive = group.id === activeGroupId;
          return (
            <button
              id={`home-visibility-tabs-tab-${group.id}`}
              key={group.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`home-visibility-tabs-panel-${group.id}`}
              tabIndex={isActive ? 0 : -1}
              ref={(element) => {
                tabRefs.current[index] = element;
              }}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              className={`relative shrink-0 rounded-t-md border-b-2 px-3.5 py-2 text-xs font-semibold uppercase tracking-wide transition-all duration-150 ${
                isActive
                  ? "border-[var(--color-primary)] bg-[var(--color-surface-soft)] text-[var(--color-text)]"
                  : "border-transparent text-[var(--color-text-muted)] hover:-translate-y-0.5 hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-text)]"
              }`}
              onClick={() => setActiveGroupId(group.id)}
            >
              {group.label} ({group.recipes.length})
            </button>
          );
        })}
      </div>

      {activeGroup ? (
        <section
          id={`home-visibility-tabs-panel-${activeGroup.id}`}
          role="tabpanel"
          aria-labelledby={`home-visibility-tabs-tab-${activeGroup.id}`}
          className="mt-3"
          tabIndex={0}
        >
          <p id={`home-visibility-tabs-active-group-${activeGroup.id}`} className="mb-2 text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
            Showing {activeGroup.label} recipes ({activeGroup.recipes.length})
          </p>
          {activeGroup.recipes.length === 0 ? (
            <p id={`home-visibility-tabs-empty-${activeGroup.id}`} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)] px-3 py-6 text-center text-sm text-[var(--color-text-muted)]">
              No recipes in this group yet.
            </p>
          ) : (
            <ul id={`home-visibility-tabs-recipes-${activeGroup.id}`} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {activeGroup.recipes.map((recipe) => (
                <li id={`home-visibility-tabs-item-${activeGroup.id}-${recipe.id}`} key={`${activeGroup.id}-${recipe.id}`} className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)]">
                  {recipe.images && recipe.images.length > 0 ? (
                    <RecipeCardCarousel recipeId={recipe.id} title={recipe.title} images={recipe.images} />
                  ) : recipe.primaryImage ? (
                    <img
                      id={`home-visibility-tabs-image-${activeGroup.id}-${recipe.id}`}
                      src={recipe.primaryImage.thumbnailUrl}
                      alt={recipe.title}
                      className="block h-36 w-full object-cover"
                    />
                  ) : null}
                  <div id={`home-visibility-tabs-item-content-${activeGroup.id}-${recipe.id}`} className="p-3">
                    <Link id={`home-visibility-tabs-link-${activeGroup.id}-${recipe.id}`} href={`/recipes/${recipe.id}`} className="text-base font-semibold hover:underline">
                      {recipe.title}
                    </Link>
                    <p id={`home-visibility-tabs-date-${activeGroup.id}-${recipe.id}`} className="mt-1 text-xs text-[var(--color-text-muted)]">
                      Added {new Date(recipe.createdAt).toLocaleDateString()}
                    </p>
                    <p id={`home-visibility-tabs-summary-${activeGroup.id}-${recipe.id}`} className="mt-1 text-xs uppercase tracking-wide text-[var(--color-primary)]">
                      {getRecipeVisibilitySummary(recipe)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </article>
  );
}
