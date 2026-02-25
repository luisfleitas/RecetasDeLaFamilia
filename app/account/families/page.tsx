import FamiliesDashboard from "@/app/account/families/families-dashboard";
import { requireAuthPage } from "@/lib/auth/require-auth-page";

export default async function FamiliesPage() {
  await requireAuthPage();

  return <FamiliesDashboard />;
}
