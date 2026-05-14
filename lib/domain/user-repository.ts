import type {
  CompleteUserProfileInput,
  CreateExternalAuthUserInput,
  CreateUserInput,
  User,
  UserAuthProvider,
} from "@/lib/domain/user";

export interface UserRepository {
  create(input: CreateUserInput): Promise<User>;
  getById(id: number): Promise<User | null>;
  getByEmail(email: string): Promise<User | null>;
  getByUsername(username: string): Promise<User | null>;
  getByAuthProviderIdentity(
    provider: UserAuthProvider,
    providerUserId: string,
  ): Promise<User | null>;
  attachAuthProviderIdentity(
    userId: number,
    provider: UserAuthProvider,
    providerUserId: string,
  ): Promise<User>;
  createExternalAuthUser(input: CreateExternalAuthUserInput): Promise<User>;
  completeProfile(userId: number, input: CompleteUserProfileInput): Promise<User>;
  updatePassword(id: number, passwordHash: string): Promise<void>;
}
