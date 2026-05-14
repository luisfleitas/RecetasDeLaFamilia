import { redirect } from "next/navigation";
import CompleteProfileForm from "@/app/account/complete-profile/complete-profile-form";
import { getSafeRelativeNext, type StableAuthSearchParams } from "@/lib/auth/stable-auth-routes";
import { requireAuthPage } from "@/lib/auth/require-auth-page";
import { isProfileComplete } from "@/lib/auth/profile-completion";
import { PrismaUserRepository } from "@/lib/infrastructure/auth/prisma-user-repository";

type CompleteProfilePageProps = {
  searchParams?: Promise<StableAuthSearchParams>;
};

export default async function CompleteProfilePage({ searchParams }: CompleteProfilePageProps) {
  const authUser = await requireAuthPage();
  const params = (await searchParams) ?? {};
  const nextPath = getSafeRelativeNext(params.next) ?? "/";

  if (isProfileComplete(authUser)) {
    redirect(nextPath);
  }

  const user = await new PrismaUserRepository().getById(authUser.userId);
  if (!user) {
    redirect("/login");
  }

  return (
    <CompleteProfileForm
      firstName={user.firstName}
      lastName={user.lastName}
      email={user.email}
      username={user.username}
      nextPath={nextPath}
    />
  );
}
