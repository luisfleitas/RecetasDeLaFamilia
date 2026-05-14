import assert from "node:assert/strict";
import { test } from "node:test";
import {
  linkClerkUserToLocalUser,
  type ClerkIdentityProfile,
  type ClerkUserLinkingStore,
} from "../lib/auth/clerk-user-linker";
import {
  ProfileCompletionConflictError,
  completeUserProfileForAuthUser,
} from "../lib/auth/profile-completion";
import type {
  CompleteUserProfileInput,
  CreateExternalAuthUserInput,
  CreateUserInput,
  User,
  UserAuthProvider,
} from "../lib/domain/user";

const now = new Date("2026-05-13T12:00:00.000Z");

class FakeClerkUserStore implements ClerkUserLinkingStore {
  public transactionCount = 0;
  public attachedIdentity:
    | { userId: number; provider: UserAuthProvider; providerUserId: string }
    | null = null;
  public createdExternalUser: CreateExternalAuthUserInput | null = null;
  private readonly users: User[];

  constructor(users: User[]) {
    this.users = users;
  }

  async runInTransaction<T>(callback: (store: ClerkUserLinkingStore) => Promise<T>): Promise<T> {
    this.transactionCount += 1;
    return callback(this);
  }

  async create(input: CreateUserInput): Promise<User> {
    throw new Error(`Unexpected local create for ${input.email}`);
  }

  async getById(id: number): Promise<User | null> {
    return this.users.find((user) => user.id === id) ?? null;
  }

  async getByEmail(email: string): Promise<User | null> {
    return this.users.find((user) => user.email === email) ?? null;
  }

  async getByUsername(username: string): Promise<User | null> {
    return this.users.find((user) => user.username === username) ?? null;
  }

  async getByAuthProviderIdentity(
    provider: UserAuthProvider,
    providerUserId: string,
  ): Promise<User | null> {
    return (
      this.users.find(
        (user) =>
          user.authProvider === provider && user.authProviderUserId === providerUserId,
      ) ?? null
    );
  }

  async attachAuthProviderIdentity(
    userId: number,
    provider: UserAuthProvider,
    providerUserId: string,
  ): Promise<User> {
    this.attachedIdentity = { userId, provider, providerUserId };
    const user = this.users.find((candidate) => candidate.id === userId);
    assert.ok(user);
    const linkedUser = { ...user, authProvider: provider, authProviderUserId: providerUserId };
    this.users[this.users.indexOf(user)] = linkedUser;
    return linkedUser;
  }

  async createExternalAuthUser(input: CreateExternalAuthUserInput): Promise<User> {
    this.createdExternalUser = input;
    const user: User = {
      id: this.users.length + 1,
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
    this.users.push(user);
    return user;
  }

  async completeProfile(
    userId: number,
    input: CompleteUserProfileInput,
  ): Promise<User> {
    const user = this.users.find((candidate) => candidate.id === userId);
    assert.ok(user);
    const completedUser = {
      ...user,
      firstName: input.firstName,
      lastName: input.lastName,
      username: input.username,
      profileCompletedAt: now,
    };
    this.users[this.users.indexOf(user)] = completedUser;
    return completedUser;
  }

  async updatePassword(): Promise<void> {
    throw new Error("Unexpected password update during Clerk linking");
  }
}

function user(overrides: Partial<User> = {}): User {
  return {
    id: 1,
    firstName: "Alice",
    lastName: "Baker",
    email: "alice@example.com",
    username: "alice",
    passwordHash: "hashed-password",
    authProvider: "local",
    authProviderUserId: null,
    profileCompletedAt: now,
    createdAt: now,
    ...overrides,
  };
}

function profile(overrides: Partial<ClerkIdentityProfile> = {}): ClerkIdentityProfile {
  return {
    providerUserId: "user_123",
    primaryEmail: "Alice@Example.com",
    firstName: "Alice",
    lastName: "Baker",
    username: "aliceb",
    ...overrides,
  };
}

test("Clerk linker resolves an existing local user by provider identity", async () => {
  const store = new FakeClerkUserStore([
    user({ authProvider: "clerk", authProviderUserId: "user_123" }),
  ]);

  const authUser = await linkClerkUserToLocalUser({ store, profile: profile(), now });

  assert.deepEqual(authUser, {
    userId: 1,
    username: "alice",
    profileCompletedAt: now,
  });
  assert.equal(store.transactionCount, 1);
});

test("Clerk linker normalizes email before linking a matching local user", async () => {
  const store = new FakeClerkUserStore([user({ email: "alice@example.com" })]);

  const authUser = await linkClerkUserToLocalUser({ store, profile: profile(), now });

  assert.deepEqual(store.attachedIdentity, {
    userId: 1,
    provider: "clerk",
    providerUserId: "user_123",
  });
  assert.deepEqual(authUser, {
    userId: 1,
    username: "alice",
    profileCompletedAt: now,
  });
});

test("Clerk linker creates a complete user when a username candidate is available", async () => {
  const store = new FakeClerkUserStore([]);

  const authUser = await linkClerkUserToLocalUser({
    store,
    profile: profile({ username: "Alice Baker" }),
    now,
  });

  assert.equal(store.createdExternalUser?.email, "alice@example.com");
  assert.equal(store.createdExternalUser?.username, "alice-baker");
  assert.equal(store.createdExternalUser?.profileCompletedAt, now);
  assert.deepEqual(authUser, {
    userId: 1,
    username: "alice-baker",
    profileCompletedAt: now,
  });
});

test("Clerk linker creates an incomplete user when username candidates collide", async () => {
  const store = new FakeClerkUserStore([
    user({ id: 1, username: "alice" }),
    user({ id: 2, username: "alice-example" }),
    user({ id: 3, username: "alice-baker" }),
  ]);

  const authUser = await linkClerkUserToLocalUser({
    store,
    profile: profile({ username: "alice", primaryEmail: "alice@newmail.com" }),
    now,
  });

  assert.equal(store.createdExternalUser?.username, "clerk-user-user-123");
  assert.equal(store.createdExternalUser?.profileCompletedAt, null);
  assert.deepEqual(authUser, {
    userId: 4,
    username: "clerk-user-user-123",
    profileCompletedAt: null,
  });
});

test("profile completion rejects a username already owned by another user", async () => {
  const store = new FakeClerkUserStore([
    user({ id: 1, username: "alice" }),
    user({ id: 2, username: "taken-name" }),
  ]);

  await assert.rejects(
    () =>
      completeUserProfileForAuthUser({
        store,
        authUser: { userId: 1, username: "clerk-user-user-123", profileCompletedAt: null },
        input: {
          firstName: "Alice",
          lastName: "Baker",
          username: "taken-name",
        },
      }),
    ProfileCompletionConflictError,
  );
});

test("profile completion updates editable fields and marks the user complete", async () => {
  const store = new FakeClerkUserStore([
    user({
      id: 1,
      firstName: "",
      lastName: "",
      username: "clerk-user-user-123",
      authProvider: "clerk",
      authProviderUserId: "user_123",
      profileCompletedAt: null,
    }),
  ]);

  const authUser = await completeUserProfileForAuthUser({
    store,
    authUser: { userId: 1, username: "clerk-user-user-123", profileCompletedAt: null },
    input: {
      firstName: "Alice",
      lastName: "Baker",
      username: "alice-baker",
    },
  });

  assert.deepEqual(authUser, {
    userId: 1,
    username: "alice-baker",
    profileCompletedAt: now,
  });
});
