import RecipeWorkspaceFrame from "@/app/_components/recipe-workspace-frame";
import FamiliesDashboard from "@/app/account/families/families-dashboard";
import { getOptionalAuthPageUser } from "@/lib/auth/page-auth-user";
import { getRequestMessages } from "@/lib/i18n/server";
import { redirect } from "next/navigation";

export default async function FamiliesPage() {
  const authUser = await getOptionalAuthPageUser();

  if (!authUser) {
    redirect("/");
  }

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
