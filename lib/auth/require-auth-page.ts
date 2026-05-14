import { redirect } from "next/navigation";
import { getOptionalAuthPageUser } from "@/lib/auth/page-auth-user";
import {
  getProfileCompletionRedirect,
  isProfileComplete,
} from "@/lib/auth/profile-completion";
import type { AppAuthUser } from "@/lib/auth/types";

export async function requireAuthPage(): Promise<AppAuthUser> {
  const authUser = await getOptionalAuthPageUser();
  if (!authUser) {
    redirect("/login");
  }
  return authUser;
}

export async function requireCompletedAuthPage(nextPath?: string): Promise<AppAuthUser> {
  const authUser = await requireAuthPage();
  if (!isProfileComplete(authUser)) {
    redirect(getProfileCompletionRedirect(nextPath));
  }
  return authUser;
}
