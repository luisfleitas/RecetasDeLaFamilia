import { redirect } from "next/navigation";
import { LoginForm } from "@/app/login/login-form";
import { resolveAuthProviderName } from "@/lib/auth/provider-config";
import {
  buildClerkAuthRedirectPath,
  type StableAuthSearchParams,
} from "@/lib/auth/stable-auth-routes";

type LoginPageProps = {
  searchParams?: Promise<StableAuthSearchParams>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  if (resolveAuthProviderName() === "clerk") {
    redirect(buildClerkAuthRedirectPath("/sign-in", (await searchParams) ?? {}));
  }

  return <LoginForm />;
}
