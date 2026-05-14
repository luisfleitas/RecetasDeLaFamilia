import RecipeWorkspaceFrame from "@/app/_components/recipe-workspace-frame";
import FamiliesDashboard from "@/app/account/families/families-dashboard";
import { requireCompletedAuthPage } from "@/lib/auth/require-auth-page";
import { getRequestMessages } from "@/lib/i18n/server";

export default async function FamiliesPage() {
  const authUser = await requireCompletedAuthPage("/account/families");
  const { locale, messages } = await getRequestMessages();

  return (
    <RecipeWorkspaceFrame
      authUser={authUser}
      contentId="manage-families-workspace-content"
      idPrefix="manage-families"
      locale={locale}
      messages={messages}
    >
      <FamiliesDashboard />
    </RecipeWorkspaceFrame>
  );
}
