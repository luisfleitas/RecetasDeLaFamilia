export type AuthProviderName = "local" | "clerk";

export type AppAuthUser = {
  userId: number;
  username: string;
  profileCompletedAt: Date | null;
};

export type RequestAuthProvider = {
  getAuthUserFromRequest(request: Request): Promise<AppAuthUser | null>;
};
