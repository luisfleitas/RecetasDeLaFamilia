import { CreateUserInput, User } from "@/lib/domain/user";
import { UserRepository } from "@/lib/domain/user-repository";
import { getPrisma } from "@/lib/prisma";

function toDomainUser(user: {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  passwordHash: string;
  createdAt: Date;
}): User {
  return {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName,
    email: user.email,
    username: user.username,
    passwordHash: user.passwordHash,
    createdAt: user.createdAt,
  };
}

export class PrismaUserRepository implements UserRepository {
  async create(input: CreateUserInput): Promise<User> {
    const prisma = await getPrisma();

    const user = await prisma.user.create({
      data: {
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        username: input.username,
        passwordHash: input.passwordHash,
      },
    });

    return toDomainUser(user);
  }

  async getById(id: number): Promise<User | null> {
    const prisma = await getPrisma();
    const user = await prisma.user.findUnique({ where: { id } });
    return user ? toDomainUser(user) : null;
  }

  async getByEmail(email: string): Promise<User | null> {
    const prisma = await getPrisma();
    const user = await prisma.user.findUnique({ where: { email } });
    return user ? toDomainUser(user) : null;
  }

  async getByUsername(username: string): Promise<User | null> {
    const prisma = await getPrisma();
    const user = await prisma.user.findUnique({ where: { username } });
    return user ? toDomainUser(user) : null;
  }

  async updatePassword(id: number, passwordHash: string): Promise<void> {
    const prisma = await getPrisma();
    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });
  }
}
