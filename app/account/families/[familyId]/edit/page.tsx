import RecipeWorkspaceFrame from "@/app/_components/recipe-workspace-frame";
import EditFamilyWorkflow from "@/app/account/families/_components/edit-family-workflow";
import FamilyWorkflowShell from "@/app/account/families/_components/family-workflow-shell";
import { loadFamilyForEditPage } from "@/lib/application/families/page-loaders";
import { parsePositiveInt } from "@/lib/application/families/validation";
import { getOptionalAuthPageUser } from "@/lib/auth/page-auth-user";
import { getRequestMessages } from "@/lib/i18n/server";
import { notFound, redirect } from "next/navigation";

type EditFamilyPageProps = {
  params: Promise<{ familyId: string }>;
};

export default async function EditFamilyPage({ params }: EditFamilyPageProps) {
  const authUser = await getOptionalAuthPageUser();

  if (!authUser) {
    redirect("/");
  }

  const { familyId: familyIdParam } = await params;
  const familyId = parsePositiveInt(familyIdParam);

  if (!familyId) {
    notFound();
  }

  const [{ locale, messages }, pageData] = await Promise.all([
    getRequestMessages(),
    loadFamilyForEditPage({ familyId, authUserId: authUser.user_id }),
  ]);

  if (pageData.access.kind === "not-found" || !pageData.family) {
    notFound();
  }

  const editMessages = messages.family.editFamily;
  const mode = pageData.access.kind === "edit" ? "edit" : "view";

  return (
    <RecipeWorkspaceFrame
      authUser={authUser}
      contentId="edit-family-workspace-content"
      idPrefix="edit-family"
      locale={locale}
      messages={messages}
    >
      <FamilyWorkflowShell
        id="edit-family-workflow-shell"
        eyebrow={editMessages.shellEyebrow}
        title={mode === "edit" ? editMessages.editShellTitle : editMessages.viewShellTitle}
        description={mode === "edit" ? editMessages.editShellDescription : editMessages.viewShellDescription}
      >
        <EditFamilyWorkflow family={pageData.family} mode={mode} />
      </FamilyWorkflowShell>
    </RecipeWorkspaceFrame>
  );
}
