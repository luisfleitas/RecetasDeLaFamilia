export type UserAuthProvider = "local" | "clerk";

export type User = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  passwordHash: string | null;
  authProvider: UserAuthProvider;
  authProviderUserId: string | null;
  profileCompletedAt: Date | null;
  createdAt: Date;
};

export type PublicUser = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  createdAt: Date;
};

export type CreateUserInput = {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  passwordHash: string;
  authProvider: UserAuthProvider;
  authProviderUserId: string | null;
  profileCompletedAt: Date | null;
};

export type CreateExternalAuthUserInput = {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  authProvider: Exclude<UserAuthProvider, "local">;
  authProviderUserId: string;
  profileCompletedAt: Date | null;
};

export type CompleteUserProfileInput = {
  firstName: string;
  lastName: string;
  username: string;
};
