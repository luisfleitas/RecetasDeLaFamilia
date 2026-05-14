import { UserProfile } from "@clerk/nextjs";

export default function UserProfilePage() {
  return (
    <main id="clerk-user-profile-page-main" className="app-shell flex min-h-[70vh] items-center justify-center">
      <section id="clerk-user-profile-page-panel" aria-label="Account security">
        <UserProfile />
      </section>
    </main>
  );
}
