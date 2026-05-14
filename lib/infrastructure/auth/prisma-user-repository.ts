import type {
  CompleteUserProfileInput,
  CreateExternalAuthUserInput,
  CreateUserInput,
  User,
  UserAuthProvider,
} from "@/lib/domain/user";
import type { UserRepository } from "@/lib/domain/user-repository";
import { getPrisma } from "@/lib/prisma";
import type { Prisma, PrismaClient } from "@prisma/client";

type PrismaAuthClient = PrismaClient | Prisma.TransactionClient;

function toDomainUser(user: {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  passwordHash: string | null;
  authProvider: string;
  authProviderUserId: string | null;
  profileCompletedAt: Date | null;
  createdAt: Date;
}): User {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    username: user.username,
    passwordHash: user.passwordHash,
    authProvider: user.authProvider as UserAuthProvider,
    authProviderUserId: user.authProviderUserId,
    profileCompletedAt: user.profileCompletedAt,
    createdAt: user.createdAt,
  };
}

export class PrismaUserRepository implements UserRepository {
  private readonly prismaClient?: PrismaAuthClient;

  constructor(prismaClient?: PrismaAuthClient) {
    this.prismaClient = prismaClient;
  }

  async runInTransaction<T>(callback: (repository: PrismaUserRepository) => Promise<T>): Promise<T> {
    if (this.prismaClient) {
      return callback(this);
    }

    const prisma = await getPrisma();
    return prisma.$transaction(async (tx) => callback(new PrismaUserRepository(tx)));
  }

  async create(input: CreateUserInput): Promise<User> {
    const prisma = await this.getClient();

    const user = await prisma.user.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        username: input.username,
        passwordHash: input.passwordHash,
        authProvider: input.authProvider,
        authProviderUserId: input.authProviderUserId,
        profileCompletedAt: input.profileCompletedAt,
      },
    });

    return toDomainUser(user);
  }

  async getById(id: number): Promise<User | null> {
    const prisma = await this.getClient();
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? toDomainUser(user) : null;
  }

  async getByEmail(email: string): Promise<User | null> {
    const prisma = await this.getClient();
    const user = await prisma.user.findUnique({ where: { email } });
    return user ? toDomainUser(user) : null;
  }

  async getByUsername(username: string): Promise<User | null> {
    const prisma = await this.getClient();
    const user = await prisma.user.findUnique({ where: { username } });
    return user ? toDomainUser(user) : null;
  }

  async getByAuthProviderIdentity(
    provider: UserAuthProvider,
    providerUserId: string,
  ): Promise<User | null> {
    const prisma = await this.getClient();
    const user = await prisma.user.findUnique({
      where: {
        authProvider_authProviderUserId: {
          authProvider: provider,
          authProviderUserId: providerUserId,
        },
      },
    });

    return user ? toDomainUser(user) : null;
  }

  async attachAuthProviderIdentity(
    userId: number,
    provider: UserAuthProvider,
    providerUserId: string,
  ): Promise<User> {
    const prisma = await this.getClient();
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        authProvider: provider,
        authProviderUserId: providerUserId,
      },
    });

    return toDomainUser(user);
  }

  async createExternalAuthUser(input: CreateExternalAuthUserInput): Promise<User> {
    const prisma = await this.getClient();
    const user = await prisma.user.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        username: input.username,
        passwordHash: null,
        authProvider: input.authProvider,
        authProviderUserId: input.authProviderUserId,
        profileCompletedAt: input.profileCompletedAt,
      },
    });

    return toDomainUser(user);
  }

  async completeProfile(userId: number, input: CompleteUserProfileInput): Promise<User> {
    const prisma = await this.getClient();
    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        username: input.username,
        profileCompletedAt: new Date(),
      },
    });

    return toDomainUser(user);
  }

  async updatePassword(id: number, passwordHash: string): Promise<void> {
    const prisma = await this.getClient();
    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  }

  private async getClient(): Promise<PrismaAuthClient> {
    return this.prismaClient ?? getPrisma();
  }
}
