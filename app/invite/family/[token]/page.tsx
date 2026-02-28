import InviteFamilyFlow from "@/app/invite/family/[token]/invite-family-flow";
import { getOptionalAuthPageUser } from "@/lib/auth/page-auth-user";
import { redirect } from "next/navigation";

type Params = {
  params: Promise<{ token: string }>;
};

export default async function InviteFamilyPage({ params }: Params) {
  const { token } = await params;
  const authUser = await getOptionalAuthPageUser();

  if (!authUser) {
    const next = encodeURIComponent(`/invite/family/${token}`);
    redirect(`/login?next=${next}`);
  }

  return <InviteFamilyFlow token={token} />;
}
