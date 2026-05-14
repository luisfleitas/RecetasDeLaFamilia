import { redirect } from "next/navigation";
import { RegisterForm } from "@/app/register/register-form";
import { resolveAuthProviderName } from "@/lib/auth/provider-config";
import {
  buildClerkAuthRedirectPath,
  type StableAuthSearchParams,
} from "@/lib/auth/stable-auth-routes";

type RegisterPageProps = {
  searchParams?: Promise<StableAuthSearchParams>;
};

export default async function RegisterPage({ searchParams }: RegisterPageProps) {
  if (resolveAuthProviderName() === "clerk") {
    redirect(buildClerkAuthRedirectPath("/sign-up", (await searchParams) ?? {}));
  }

  return <RegisterForm />;
}
