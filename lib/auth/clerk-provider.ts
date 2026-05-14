import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import {
  linkClerkUserToLocalUser,
  toAppAuthUser,
  type ClerkIdentityProfile,
  type ClerkUserLinkingStore,
} from "@/lib/auth/clerk-user-linker";
import type { AppAuthUser, RequestAuthProvider } from "@/lib/auth/types";

export function createClerkAuthProvider(store: ClerkUserLinkingStore): RequestAuthProvider {
  return {
    getAuthUserFromRequest: () => getClerkAuthUser(store),
  };
}

export async function getClerkAuthUser(
  store: ClerkUserLinkingStore,
): Promise<AppAuthUser | null> {
  const { isAuthenticated, userId } = await auth();
  if (!isAuthenticated || !userId) {
    return null;
  }

  const existingUser = await store.getByAuthProviderIdentity("clerk", userId);
  if (existingUser) {
    return toAppAuthUser(existingUser);
  }

  const clerkUser = await currentUser();
  const profile = clerkUser ? toClerkIdentityProfile(userId, clerkUser) : null;
  if (!profile) {
    return null;
  }

  return linkClerkUserToLocalUser({ store, profile });
}

export async function revokeCurrentClerkSession(): Promise<void> {
  const { sessionId } = await auth();
  if (!sessionId) {
    return;
  }

  const client = await clerkClient();
  await client.sessions.revokeSession(sessionId);
}

function toClerkIdentityProfile(
  providerUserId: string,
  clerkUser: NonNullable<Awaited<ReturnType<typeof currentUser>>>,
): ClerkIdentityProfile | null {
  const primaryEmail =
    clerkUser?.primaryEmailAddress?.emailAddress ??
    clerkUser?.emailAddresses.find((email) => email.id === clerkUser.primaryEmailAddressId)
      ?.emailAddress;

  if (!primaryEmail) {
    return null;
  }

  return {
    providerUserId,
    primaryEmail,
    firstName: clerkUser.firstName,
    lastName: clerkUser.lastName,
    username: clerkUser.username,
  };
}
