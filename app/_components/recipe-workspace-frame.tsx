import type { ReactNode } from "react";
import LocaleSwitcher from "@/app/_components/locale-switcher";
import HomeAccountMenu from "@/app/_components/home-account-menu";
import HomeLeftNavigation from "@/app/_components/home-left-navigation";
import type { AccessTokenPayload } from "@/lib/auth/jwt";
import {
  buildHomeNavigationViewModel,
} from "@/lib/application/home-navigation/view-model";
import { loadHomeNavigationFamiliesForPage } from "@/lib/application/home-navigation/page-home-navigation-loader";
import { loadRecipeListForPage } from "@/lib/application/recipes/page-recipe-list-loader";
import type { Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages";

type RecipeWorkspaceFrameProps = {
  authUser: AccessTokenPayload;
  children: ReactNode;
  contentClassName?: string;
  contentId: string;
  idPrefix: string;
  locale: Locale;
  messages: Messages;
};

export default async function RecipeWorkspaceFrame({
  authUser,
  children,
  contentClassName = "home-refresh-main",
  contentId,
  idPrefix,
  locale,
  messages,
}: RecipeWorkspaceFrameProps) {
  const [recipesResponse, familyMemberships] = await Promise.all([
    loadRecipeListForPage({ viewerUserId: authUser.user_id }),
    loadHomeNavigationFamiliesForPage(authUser.user_id),
  ]);
  const homeNavigation = buildHomeNavigationViewModel({
    userId: authUser.user_id,
    recipes: recipesResponse.recipes,
    families: familyMemberships,
  });

  return (
    <main id={`${idPrefix}-workspace-main`} className="recipe-workspace-main relative min-h-screen overflow-hidden py-3 sm:py-4">
      <div id={`${idPrefix}-workspace-shell`} className="home-app-shell">
        <div id="recipe-workspace-frame" className="home-app-frame">
          <header id="recipe-workspace-top-header" className="home-utility-header">
            <div id="recipe-workspace-top-header-row" className="page-header-bar">
              <div id="recipe-workspace-top-header-brand" className="page-header-copy">
                <p id="recipe-workspace-top-header-eyebrow" className="page-eyebrow">Recetas</p>
              </div>

              <div id="recipe-workspace-top-header-actions" className="flex flex-wrap items-center justify-end gap-2 sm:flex-nowrap">
                <LocaleSwitcher locale={locale} />
                <HomeAccountMenu
                  username={authUser.username}
                  accountSettingsLabel={messages.home.accountSettings}
                  logOutLabel={messages.home.logOut}
                />
              </div>
            </div>
          </header>

          <div id="recipe-workspace-body" className="home-refresh-body">
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

            <div id={contentId} className={contentClassName}>
              {children}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
