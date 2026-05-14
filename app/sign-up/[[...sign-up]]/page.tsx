import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <main id="clerk-sign-up-page-main" className="app-shell flex min-h-[70vh] items-center justify-center">
      <section id="clerk-sign-up-page-panel" aria-label="Sign up">
        <SignUp />
      </section>
    </main>
  );
}
