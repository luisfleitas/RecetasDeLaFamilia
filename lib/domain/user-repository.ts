import { CreateUserInput, User } from "@/lib/domain/user";

export interface UserRepository {
  create(input: CreateUserInput): Promise<User>;
  getById(id: number): Promise<User | null>;
  getByEmail(email: string): Promise<User | null>;
  getByUsername(username: string): Promise<User | null>;
  updatePassword(id: number, passwordHash: string): Promise<void>;
}
