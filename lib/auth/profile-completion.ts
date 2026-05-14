import { AUTH_MESSAGE_CODES, type AuthMessageCode } from "@/lib/application/auth/errors";
import { getSafeRelativeNext } from "@/lib/auth/stable-auth-routes";
import { toAppAuthUser } from "@/lib/auth/clerk-user-linker";
import type { AppAuthUser } from "@/lib/auth/types";
import type { CompleteUserProfileInput } from "@/lib/domain/user";
import type { UserRepository } from "@/lib/domain/user-repository";

export const PROFILE_COMPLETION_PATH = "/account/complete-profile";
export const PROFILE_INCOMPLETE_CODE = "PROFILE_INCOMPLETE";

export class ProfileCompletionConflictError extends Error {
  public readonly code: AuthMessageCode;

  constructor(code: AuthMessageCode) {
    super(code);
    this.name = "ProfileCompletionConflictError";
    this.code = code;
  }
}

export function isProfileComplete(authUser: AppAuthUser): boolean {
  return Boolean(authUser.profileCompletedAt);
}

export function getProfileCompletionRedirect(nextPath?: string | null): string {
  const safeNext = getSafeRelativeNext(nextPath ?? undefined);
  if (!safeNext) {
    return PROFILE_COMPLETION_PATH;
  }

  const params = new URLSearchParams({ next: safeNext });
  return `${PROFILE_COMPLETION_PATH}?${params.toString()}`;
}

export async function completeUserProfileForAuthUser(input: {
  store: UserRepository;
  authUser: AppAuthUser;
  input: CompleteUserProfileInput;
}): Promise<AppAuthUser> {
  const username = input.input.username.trim().toLowerCase();
  const existingUsernameUser = await input.store.getByUsername(username);
  if (existingUsernameUser && existingUsernameUser.id !== input.authUser.userId) {
    throw new ProfileCompletionConflictError(AUTH_MESSAGE_CODES.USERNAME_IN_USE);
  }

  const completedUser = await input.store.completeProfile(input.authUser.userId, {
    firstName: input.input.firstName.trim(),
    lastName: input.input.lastName.trim(),
    username,
  });

  return toAppAuthUser(completedUser);
}
