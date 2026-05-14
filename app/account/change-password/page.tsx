import { redirect } from "next/navigation";
import { requireCompletedAuthPage } from "@/lib/auth/require-auth-page";
import ChangePasswordForm from "@/app/account/change-password/change-password-form";
import { resolveAuthProviderName } from "@/lib/auth/provider-config";

export default async function ChangePasswordPage() {
  if (resolveAuthProviderName() === "clerk") {
    redirect("/user-profile");
  }

  await requireCompletedAuthPage("/account/change-password");

  return <ChangePasswordForm />;
}
