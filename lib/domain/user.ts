export type User = {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  passwordHash: string;
  createdAt: Date;
};

export type PublicUser = Omit<User, "passwordHash">;

export type CreateUserInput = {
  firstName: string;
  lastName: string;
  email: string;
  username: string;
  passwordHash: string;
};
