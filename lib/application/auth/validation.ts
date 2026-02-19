type IncomingRegisterInput = {
  first_name?: unknown;
  last_name?: unknown;
  email?: unknown;
  username?: unknown;
  password?: unknown;
};

type IncomingLoginInput = {
  username?: unknown;
  password?: unknown;
};

type IncomingChangePasswordInput = {
  current_password?: unknown;
  new_password?: unknown;
};

function requireString(value: unknown, field: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${field} is required`);
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
  username: string;
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
    throw new Error("password must be at least 8 characters");
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

  return {
    username: requireString(body.username, "username").toLowerCase(),
    password: requireString(body.password, "password"),
  };
}

export function parseChangePasswordInput(input: unknown): ChangePasswordInput {
  const body = input as IncomingChangePasswordInput;

  const currentPassword = requireString(body.current_password, "current_password");
  const newPassword = requireString(body.new_password, "new_password");

  if (newPassword.length < 8) {
    throw new Error("new_password must be at least 8 characters");
  }

  return {
    currentPassword,
    newPassword,
  };
}
