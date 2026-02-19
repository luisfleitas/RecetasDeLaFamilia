import { redirect } from "next/navigation";
import { getOptionalAuthPageUser } from "@/lib/auth/page-auth-user";

export async function requireAuthPage() {
  const authUser = await getOptionalAuthPageUser();
  if (!authUser) {
    redirect("/login");
  }
  return authUser;
}
