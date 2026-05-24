import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import {
  AUTH_MESSAGE_CODES,
  AuthInvalidCredentialsError,
} from "../lib/application/auth/errors";
import { verifyAccessToken } from "../lib/auth/jwt";
import { makeAuthUseCases } from "../lib/application/auth/use-cases";
import type {
  CompleteUserProfileInput,
  CreateExternalAuthUserInput,
  CreateUserInput,
  User,
  UserAuthProvider,
} from "../lib/domain/user";
import type { UserRepository } from "../lib/domain/user-repository";

const now = new Date("2026-05-13T00:00:00.000Z");

beforeEach(() => {
  process.env.JWT_SECRET = "auth-use-cases-test-secret";
});

class FakeUserRepository implements UserRepository {
  public createdInput: CreateUserInput | null = null;
  private readonly users = new Map<number, User>();

  constructor(users: User[] = []) {
    for (const user of users) {
      this.users.set(user.id, user);
    }
  }

  async create(input: CreateUserInput): Promise<User> {
    this.createdInput = input;
    const user: User = {
      id: 1,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      username: input.username,
      passwordHash: input.passwordHash,
      authProvider: input.authProvider,
      authProviderUserId: input.authProviderUserId,
      profileCompletedAt: input.profileCompletedAt,
      createdAt: now,
    };
    this.users.set(user.id, user);
    return user;
  }

  async getById(id: number): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async getByEmail(email: string): Promise<User | null> {
    return [...this.users.values()].find((user) => user.email === email) ?? null;
  }

  async getByUsername(username: string): Promise<User | null> {
    return [...this.users.values()].find((user) => user.username === username) ?? null;
  }

  async getByAuthProviderIdentity(
    provider: UserAuthProvider,
    providerUserId: string,
  ): Promise<User | null> {
    return (
      [...this.users.values()].find(
        (user) => user.authProvider === provider && user.authProviderUserId === providerUserId,
      ) ?? null
    );
  }

  async attachAuthProviderIdentity(
    userId: number,
    provider: UserAuthProvider,
    providerUserId: string,
  ): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const updated = { ...user, authProvider: provider, authProviderUserId: providerUserId };
    this.users.set(userId, updated);
    return updated;
  }

  async createExternalAuthUser(input: CreateExternalAuthUserInput): Promise<User> {
    const user: User = {
      id: this.users.size + 1,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      username: input.username,
      passwordHash: null,
      authProvider: input.authProvider,
      authProviderUserId: input.authProviderUserId,
      profileCompletedAt: input.profileCompletedAt,
      createdAt: now,
    };
    this.users.set(user.id, user);
    return user;
  }

  async completeProfile(userId: number, input: CompleteUserProfileInput): Promise<User> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error("User not found");
    }

    const updated = {
      ...user,
      firstName: input.firstName,
      lastName: input.lastName,
      username: input.username,
      profileCompletedAt: now,
    };
    this.users.set(userId, updated);
    return updated;
  }

  async updatePassword(id: number, passwordHash: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      this.users.set(id, { ...user, passwordHash });
    }
  }
}

function externalAuthUser(overrides: Partial<User> = {}): User {
  return {
    id: 7,
    firstName: "Clerk",
    lastName: "User",
    email: "clerk@example.com",
    username: "clerkuser",
    passwordHash: null,
    authProvider: "clerk",
    authProviderUserId: "user_123",
    profileCompletedAt: now,
    createdAt: now,
    ...overrides,
  };
}

test("local registration creates local password-backed complete users", async () => {
  const repository = new FakeUserRepository();
  const auth = makeAuthUseCases(repository);

  await auth.register({
    firstName: "Alice",
    lastName: "Baker",
    email: "alice@example.com",
    username: "alice",
    password: "Password123!",
  });

  assert.equal(repository.createdInput?.authProvider, "local");
  assert.equal(repository.createdInput?.authProviderUserId, null);
  assert.ok(repository.createdInput?.passwordHash);
  assert.ok(repository.createdInput?.profileCompletedAt instanceof Date);

  const { accessToken } = await auth.login({
    usernameOrEmail: "alice",
    password: "Password123!",
  });
  assert.equal(
    verifyAccessToken(accessToken).profile_completed_at,
    repository.createdInput.profileCompletedAt?.toISOString(),
  );
});

test("local login rejects users without a password hash", async () => {
  const repository = new FakeUserRepository([externalAuthUser()]);
  const auth = makeAuthUseCases(repository);

  await assert.rejects(
    () =>
      auth.login({
        usernameOrEmail: "clerk@example.com",
        password: "Password123!",
      }),
    (error) =>
      error instanceof AuthInvalidCredentialsError &&
      error.code === AUTH_MESSAGE_CODES.INVALID_CREDENTIALS,
  );
});

test("local change password rejects users without a password hash", async () => {
  const repository = new FakeUserRepository([externalAuthUser()]);
  const auth = makeAuthUseCases(repository);

  await assert.rejects(
    () =>
      auth.changePassword({
        userId: 7,
        currentPassword: "Password123!",
        newPassword: "NewPassword123!",
      }),
    (error) =>
      error instanceof AuthInvalidCredentialsError &&
      error.code === AUTH_MESSAGE_CODES.INVALID_CREDENTIALS,
  );
});
