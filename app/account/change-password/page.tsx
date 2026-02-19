import { requireAuthPage } from "@/lib/auth/require-auth-page";
import ChangePasswordForm from "@/app/account/change-password/change-password-form";

export default async function ChangePasswordPage() {
  await requireAuthPage();

  return <ChangePasswordForm />;
}
