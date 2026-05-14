import FamiliesDashboard from "@/app/account/families/families-dashboard";
import { requireCompletedAuthPage } from "@/lib/auth/require-auth-page";

export default async function FamiliesPage() {
  await requireCompletedAuthPage("/account/families");

  return <FamiliesDashboard />;
}
