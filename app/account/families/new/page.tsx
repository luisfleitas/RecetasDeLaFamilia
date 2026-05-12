import RecipeWorkspaceFrame from "@/app/_components/recipe-workspace-frame";
import CreateFamilyWorkflow from "@/app/account/families/_components/create-family-workflow";
import FamilyWorkflowShell from "@/app/account/families/_components/family-workflow-shell";
import { getOptionalAuthPageUser } from "@/lib/auth/page-auth-user";
import { getRequestMessages } from "@/lib/i18n/server";
import { redirect } from "next/navigation";

export default async function NewFamilyPage() {
  const authUser = await getOptionalAuthPageUser();

  if (!authUser) {
    redirect("/");
  }

  const { locale, messages } = await getRequestMessages();
  const createFamilyMessages = messages.family.createFamily;

  return (
    <RecipeWorkspaceFrame
      authUser={authUser}
      contentId="create-family-workspace-content"
      idPrefix="create-family"
      locale={locale}
      messages={messages}
    >
      <FamilyWorkflowShell
        id="create-family-shell"
        eyebrow={createFamilyMessages.shellEyebrow}
        title={createFamilyMessages.shellTitle}
        description={createFamilyMessages.shellDescription}
      >
        <CreateFamilyWorkflow />
      </FamilyWorkflowShell>
    </RecipeWorkspaceFrame>
  );
}
