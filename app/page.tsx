// Home page that lists recipes from the API.
import Link from "next/link";
import { getOptionalAuthPageUser } from "@/lib/auth/page-auth-user";
import LocaleSwitcher from "@/app/_components/locale-switcher";
import HomeAccountMenu from "@/app/_components/home-account-menu";
import HomeFeaturedCarousel from "@/app/_components/home-featured-carousel";
import HomeLeftNavigation from "@/app/_components/home-left-navigation";
import RecipeCardCarousel from "@/app/_components/recipe-card-carousel";
import { buttonClassName } from "@/app/_components/ui/button-styles";
import RecipeVisibilityTabs, { type RecipeVisibilityTabGroup } from "@/app/_components/recipe-visibility-tabs";
import { formatDate } from "@/lib/i18n/format";
import { getRequestMessages } from "@/lib/i18n/server";
import {
  buildFeaturedRecipeSlides,
  buildHomeRecipeMediaCarouselItems,
  buildRecipeVisibilityTabGroups,
  buildHomeNavigationViewModel,
  getHomeRecipeDisplayMediaRefs,
} from "@/lib/application/home-navigation/view-model";
import { loadHomeNavigationFamiliesForPage } from "@/lib/application/home-navigation/page-home-navigation-loader";
import { loadRecipeListForPage } from "@/lib/application/recipes/page-recipe-list-loader";

export default async function HomePage() {
  const [{ locale, messages }, authUser] = await Promise.all([
    getRequestMessages(),
    getOptionalAuthPageUser(),
  ]);
  // Server-rendered pages read through application use cases so protected deployments do not self-fetch through Vercel Authentication.
  const recipesResponse = await loadRecipeListForPage({ viewerUserId: authUser?.user_id ?? null });
  const { recipes } = recipesResponse;
  const publicRecipes = recipes.filter((recipe) => recipe.visibility === "public");
  const visibleRecipes = authUser ? recipes : publicRecipes;
  const featuredSlides = buildFeaturedRecipeSlides(visibleRecipes);
  const familyMemberships = authUser ? await loadHomeNavigationFamiliesForPage(authUser.user_id) : [];
  const homeNavigation = authUser
    ? buildHomeNavigationViewModel({
        userId: authUser.user_id,
        recipes: visibleRecipes,
        families: familyMemberships,
      })
    : null;
  const visibilityTabGroups: RecipeVisibilityTabGroup[] = authUser
    ? buildRecipeVisibilityTabGroups(recipes, {
        locale,
        publicRecipesLabel: messages.home.publicRecipesTab,
        privateRecipesLabel: messages.home.privateRecipesTab,
        familyVisibilityPrefix: messages.home.familyVisibilityPrefix,
        familyUnassignedLabel: messages.home.familyUnassigned,
      })
    : [];
  const greeting = authUser ? messages.home.homeGreeting.replace("{username}", authUser.username) : messages.home.guestGreeting;

  return (
    <main id="home-page-main" className="relative min-h-screen overflow-hidden py-3 sm:py-4">
      <div id="home-app-shell" className="home-app-shell">
        <div id="home-app-frame" className="home-app-frame">
        <header id="home-page-top-header" className="home-utility-header">
          <div id="home-page-top-header-row" className="page-header-bar">
            <div id="home-page-top-header-brand" className="page-header-copy">
              <p id="home-page-top-header-eyebrow" className="page-eyebrow">Recetas</p>
            </div>

            <div id="home-page-top-header-actions" className="flex flex-wrap items-center justify-end gap-2 sm:flex-nowrap">
              <LocaleSwitcher locale={locale} />

              {!authUser ? (
                <>
                  <Link id="home-create-account-link" href="/register" className={`${buttonClassName("secondary")} whitespace-nowrap`}>
                    {messages.home.createAccount}
                  </Link>
                  <Link id="home-login-link" href="/login" className={`${buttonClassName("secondary")} whitespace-nowrap`}>
                    {messages.home.logIn}
                  </Link>
                </>
              ) : (
                <HomeAccountMenu
                  username={authUser.username}
                  accountSettingsLabel={messages.home.accountSettings}
                  logOutLabel={messages.home.logOut}
                />
              )}
            </div>
          </div>
        </header>

        <div id="home-refresh-body" className={authUser ? "home-refresh-body" : "home-refresh-shell"}>
          {homeNavigation ? (
            <HomeLeftNavigation
              families={homeNavigation.families}
              recipes={homeNavigation.recipes}
              familyCreateHref={homeNavigation.familyCreateHref}
              recipeCreateHref={homeNavigation.recipeCreateHref}
              familiesMoreHref={homeNavigation.familiesMoreHref}
              recipesMoreHref={homeNavigation.recipesMoreHref}
              labels={{
                families: messages.common.myFamilies,
                recipes: messages.common.recipes,
                addFamily: messages.home.addFamily,
                addRecipe: messages.home.addRecipe,
                edit: messages.home.edit,
                more: messages.home.more,
                expandNavigation: messages.home.expandNavigation,
                collapseNavigation: messages.home.collapseNavigation,
                noFamilies: messages.home.noFamilies,
                noOwnedRecipes: messages.home.noOwnedRecipes,
              }}
            />
          ) : null}

          <div id="home-refresh-main" className="home-refresh-main">
            <section id="home-greeting-section" className="home-greeting-row">
              <h1 id="home-greeting-title" className="home-greeting-title">
                {greeting}
              </h1>
              <span id="home-recipe-count-pill" className="home-recipe-count-pill">
                {visibleRecipes.length} {visibleRecipes.length === 1 ? messages.home.heritageRecipeSingular : messages.home.heritageRecipePlural}
              </span>
            </section>

            <section id="home-content-section" className="home-content-section">
              <HomeFeaturedCarousel
                slides={featuredSlides}
                labels={{
                  title: messages.home.featuredRecipes,
                  previous: messages.home.previousFeaturedRecipe,
                  next: messages.home.nextFeaturedRecipe,
                }}
              />

              <div id="home-recipe-groups" className="min-w-0">
                {visibleRecipes.length === 0 ? (
                  <article id="home-empty-state-card" className="surface-card p-10 text-center">
                    <h2 id="home-empty-state-title" className="text-xl font-semibold">{messages.home.emptyTitle}</h2>
                    <p id="home-empty-state-description" className="mx-auto mt-3 max-w-lg text-sm text-[var(--color-text-muted)]">
                      {messages.home.emptyDescription}
                    </p>
                  </article>
                ) : authUser ? (
                  <RecipeVisibilityTabs groups={visibilityTabGroups} />
                ) : (
                  <article id="home-public-recipes-card" className="surface-card p-4 sm:p-5">
                    <p id="home-public-recipes-label" className="mb-2 text-xs uppercase tracking-wide text-[var(--color-text-muted)]">
                      {messages.home.publicRecipesLabel} ({publicRecipes.length})
                    </p>
                    <ul id="home-public-recipes-list" className="home-recipe-card-grid">
                      {publicRecipes.map((recipe) => {
                        const mediaItems = buildHomeRecipeMediaCarouselItems(recipe);
                        const displayImages = getHomeRecipeDisplayMediaRefs(recipe);
                        return (
                          <li id={`home-public-recipes-item-${recipe.id}`} key={recipe.id} className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-surface-soft)]">
                            {mediaItems.length > 0 ? (
                              <RecipeCardCarousel
                                recipeId={recipe.id}
                                title={recipe.title}
                                images={displayImages}
                                mediaItems={mediaItems}
                              />
                            ) : null}
                            <div id={`home-public-recipes-item-content-${recipe.id}`} className="p-3">
                              <Link id={`home-public-recipes-link-${recipe.id}`} href={`/recipes/${recipe.id}`} className="text-base font-semibold hover:underline">
                                {recipe.title}
                              </Link>
                              <p id={`home-public-recipes-date-${recipe.id}`} className="mt-1 text-xs text-[var(--color-text-muted)]">
                                {messages.home.addedOn} {formatDate(recipe.createdAt, locale)}
                              </p>
                              <p id={`home-public-recipes-summary-${recipe.id}`} className="mt-1 text-xs uppercase tracking-wide text-[var(--brand-orange-700)]">
                                {messages.home.publicVisibility}
                              </p>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </article>
                )}
              </div>
            </section>
          </div>
        </div>
        </div>
      </div>
    </main>
  );
}
