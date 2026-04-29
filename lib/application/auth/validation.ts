import { AUTH_MESSAGE_CODES, AuthValidationError } from "@/lib/application/auth/errors";

type IncomingRegisterInput = {
  first_name?: unknown;
  last_name?: unknown;
  email?: unknown;
  username?: unknown;
  password?: unknown;
};

type IncomingLoginInput = {
  username?: unknown;
  email?: unknown;
  username_or_email?: unknown;
  password?: unknown;
};

type IncomingChangePasswordInput = {
  current_password?: unknown;
  new_password?: unknown;
};

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    const code = {
      first_name: AUTH_MESSAGE_CODES.REQUIRED_FIRST_NAME,
      last_name: AUTH_MESSAGE_CODES.REQUIRED_LAST_NAME,
      email: AUTH_MESSAGE_CODES.REQUIRED_EMAIL,
      username: AUTH_MESSAGE_CODES.REQUIRED_USERNAME,
      password: AUTH_MESSAGE_CODES.REQUIRED_PASSWORD,
      username_or_email: AUTH_MESSAGE_CODES.REQUIRED_USERNAME_OR_EMAIL,
      current_password: AUTH_MESSAGE_CODES.REQUIRED_CURRENT_PASSWORD,
      new_password: AUTH_MESSAGE_CODES.REQUIRED_NEW_PASSWORD,
    }[field];

    throw new AuthValidationError(code ?? AUTH_MESSAGE_CODES.REQUIRED_PASSWORD);
  }
  return value.trim();
}

export type RegisterInput = {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  password: string;
};

export type LoginInput = {
  usernameOrEmail: string;
  password: string;
};

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
};

export function parseRegisterInput(input: unknown): RegisterInput {
  const body = input as IncomingRegisterInput;

  const firstName = requireString(body.first_name, "first_name");
  const lastName = requireString(body.last_name, "last_name");
  const email = requireString(body.email, "email").toLowerCase();
  const username = requireString(body.username, "username").toLowerCase();
  const password = requireString(body.password, "password");

  if (password.length < 8) {
    throw new AuthValidationError(AUTH_MESSAGE_CODES.PASSWORD_TOO_SHORT);
  }

  return {
    firstName,
    lastName,
    email,
    username,
    password,
  };
}

export function parseLoginInput(input: unknown): LoginInput {
  const body = input as IncomingLoginInput;
  const usernameOrEmailRaw =
    body.username_or_email ?? body.username ?? body.email;

  return {
    usernameOrEmail: requireString(usernameOrEmailRaw, "username_or_email").toLowerCase(),
    password: requireString(body.password, "password"),
  };
}

export function parseChangePasswordInput(input: unknown): ChangePasswordInput {
  const body = input as IncomingChangePasswordInput;

  const currentPassword = requireString(body.current_password, "current_password");
  const newPassword = requireString(body.new_password, "new_password");

  if (newPassword.length < 8) {
    throw new AuthValidationError(AUTH_MESSAGE_CODES.NEW_PASSWORD_TOO_SHORT);
  }

  return {
    currentPassword,
    newPassword,
  };
}
