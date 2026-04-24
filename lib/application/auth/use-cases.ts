import { AUTH_MESSAGE_CODES, AuthConflictError, AuthInvalidCredentialsError } from "@/lib/application/auth/errors";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { signAccessToken } from "@/lib/auth/jwt";
import { UserRepository } from "@/lib/domain/user-repository";
import { PublicUser } from "@/lib/domain/user";

type RegisterInput = {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
};

type LoginInput = {
  usernameOrEmail: string;
  password: string;
};

type ChangePasswordInput = {
  userId: number;
  currentPassword: string;
  newPassword: string;
};

function toPublicUser(input: {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  createdAt: Date;
}): PublicUser {
  return {
    id: input.id,
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    username: input.username,
    createdAt: input.createdAt,
  };
}

export type AuthUseCases = {
  register: (input: RegisterInput) => Promise<PublicUser>;
  login: (input: LoginInput) => Promise<{ accessToken: string }>;
  changePassword: (input: ChangePasswordInput) => Promise<void>;
};

export function makeAuthUseCases(userRepository: UserRepository): AuthUseCases {
  return {
    async register(input: RegisterInput) {
      const [existingByEmail, existingByUsername] = await Promise.all([
        userRepository.getByEmail(input.email),
        userRepository.getByUsername(input.username),
      ]);

      if (existingByEmail) {
        throw new AuthConflictError(AUTH_MESSAGE_CODES.EMAIL_IN_USE);
      }

      if (existingByUsername) {
        throw new AuthConflictError(AUTH_MESSAGE_CODES.USERNAME_IN_USE);
      }

      const passwordHash = await hashPassword(input.password);

      const user = await userRepository.create({
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        username: input.username,
        passwordHash,
      });

      return toPublicUser(user);
    },

    async login(input: LoginInput) {
      const lookup = input.usernameOrEmail;
      const user =
        (lookup.includes("@")
          ? await userRepository.getByEmail(lookup)
          : await userRepository.getByUsername(lookup)) ??
        null;
      if (!user) {
        throw new AuthInvalidCredentialsError(AUTH_MESSAGE_CODES.INVALID_CREDENTIALS);
      }

      const validPassword = await verifyPassword(input.password, user.passwordHash);
      if (!validPassword) {
        throw new AuthInvalidCredentialsError(AUTH_MESSAGE_CODES.INVALID_CREDENTIALS);
      }

      const accessToken = signAccessToken({
        userId: user.id,
        username: user.username,
      });

      return { accessToken };
    },

    async changePassword(input: ChangePasswordInput) {
      const user = await userRepository.getById(input.userId);
      if (!user) {
        throw new AuthInvalidCredentialsError(AUTH_MESSAGE_CODES.INVALID_CREDENTIALS);
      }

      const validPassword = await verifyPassword(input.currentPassword, user.passwordHash);
      if (!validPassword) {
        throw new AuthInvalidCredentialsError(AUTH_MESSAGE_CODES.CURRENT_PASSWORD_INCORRECT);
      }

      const passwordHash = await hashPassword(input.newPassword);
      await userRepository.updatePassword(user.id, passwordHash);
    },
  };
}
