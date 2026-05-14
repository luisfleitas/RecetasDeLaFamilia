import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <main id="clerk-sign-in-page-main" className="app-shell flex min-h-[70vh] items-center justify-center">
      <section id="clerk-sign-in-page-panel" aria-label="Sign in">
        <SignIn />
      </section>
    </main>
  );
}
