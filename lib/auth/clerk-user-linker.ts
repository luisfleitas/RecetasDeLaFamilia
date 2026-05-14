import { buildReservedClerkUsername, buildUsernameCandidates } from "@/lib/auth/username-candidates";
import type { AppAuthUser } from "@/lib/auth/types";
import type {
  CreateExternalAuthUserInput,
  User,
} from "@/lib/domain/user";
import type { UserRepository } from "@/lib/domain/user-repository";

export type ClerkIdentityProfile = {
  providerUserId: string;
  primaryEmail: string;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
};

export interface ClerkUserLinkingStore extends UserRepository {
  runInTransaction<T>(callback: (store: ClerkUserLinkingStore) => Promise<T>): Promise<T>;
}

export async function linkClerkUserToLocalUser(input: {
  store: ClerkUserLinkingStore;
  profile: ClerkIdentityProfile;
  now?: Date;
}): Promise<AppAuthUser> {
  const now = input.now ?? new Date();
  const normalizedEmail = normalizeEmail(input.profile.primaryEmail);

  return input.store.runInTransaction(async (store) => {
    const providerUser = await store.getByAuthProviderIdentity(
      "clerk",
      input.profile.providerUserId,
    );
    if (providerUser) {
      return toAppAuthUser(providerUser);
    }

    const emailUser = await store.getByEmail(normalizedEmail);
    if (emailUser) {
      const linkedUser = await store.attachAuthProviderIdentity(
        emailUser.id,
        "clerk",
        input.profile.providerUserId,
      );
      return toAppAuthUser(linkedUser);
    }

    const externalUser = await createExternalUser(store, input.profile, normalizedEmail, now);
    return toAppAuthUser(externalUser);
  });
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function toAppAuthUser(user: User): AppAuthUser {
  return {
    userId: user.id,
    username: user.username,
    profileCompletedAt: user.profileCompletedAt,
  };
}

async function createExternalUser(
  store: ClerkUserLinkingStore,
  profile: ClerkIdentityProfile,
  normalizedEmail: string,
  now: Date,
): Promise<User> {
  const availableUsername = await findAvailableUsername(store, profile, normalizedEmail);
  const profileCompletedAt = availableUsername ? now : null;
  const username = availableUsername ?? buildReservedClerkUsername(profile.providerUserId);
  const externalUserInput: CreateExternalAuthUserInput = {
    firstName: profile.firstName?.trim() || "",
    lastName: profile.lastName?.trim() || "",
    email: normalizedEmail,
    username,
    authProvider: "clerk",
    authProviderUserId: profile.providerUserId,
    profileCompletedAt,
  };

  return store.createExternalAuthUser(externalUserInput);
}

async function findAvailableUsername(
  store: ClerkUserLinkingStore,
  profile: ClerkIdentityProfile,
  normalizedEmail: string,
): Promise<string | null> {
  const candidates = buildUsernameCandidates({
    username: profile.username,
    primaryEmail: normalizedEmail,
    firstName: profile.firstName,
    lastName: profile.lastName,
  });

  for (const candidate of candidates) {
    const existingUser = await store.getByUsername(candidate);
    if (!existingUser) {
      return candidate;
    }
  }

  return null;
}
