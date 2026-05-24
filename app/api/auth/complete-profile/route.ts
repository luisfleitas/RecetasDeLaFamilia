import {
  AUTH_MESSAGE_CODES,
  AuthValidationError,
} from "@/lib/application/auth/errors";
import { parseCompleteProfileInput } from "@/lib/application/auth/validation";
import { signAccessToken } from "@/lib/auth/jwt";
import { resolveAuthProviderName } from "@/lib/auth/provider-config";
import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
import { ACCESS_TOKEN_COOKIE, getAccessTokenCookieConfig } from "@/lib/auth/session-cookie";
import {
  ProfileCompletionConflictError,
  completeUserProfileForAuthUser,
} from "@/lib/auth/profile-completion";
import { PrismaUserRepository } from "@/lib/infrastructure/auth/prisma-user-repository";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authUser = await getAuthUserFromRequest(request);

  if (!authUser) {
    return NextResponse.json({ errorCode: AUTH_MESSAGE_CODES.UNAUTHORIZED }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ errorCode: AUTH_MESSAGE_CODES.INVALID_JSON_BODY }, { status: 400 });
  }

  let input;
  try {
    input = parseCompleteProfileInput(body);
  } catch (error) {
    const errorCode =
      error instanceof AuthValidationError
        ? error.code
        : AUTH_MESSAGE_CODES.INVALID_COMPLETE_PROFILE_PAYLOAD;
    return NextResponse.json({ errorCode }, { status: 400 });
  }

  try {
    const completedAuthUser = await completeUserProfileForAuthUser({
      store: new PrismaUserRepository(),
      authUser,
      input,
    });

    const response = NextResponse.json({
      ok: true,
      user: {
        user_id: completedAuthUser.userId,
        username: completedAuthUser.username,
      },
    });

    if (resolveAuthProviderName() === "local") {
      response.cookies.set(
        ACCESS_TOKEN_COOKIE,
        signAccessToken({
          userId: completedAuthUser.userId,
          username: completedAuthUser.username,
          profileCompletedAt: completedAuthUser.profileCompletedAt,
        }),
        getAccessTokenCookieConfig(),
      );
    }

    return response;
  } catch (error) {
    if (error instanceof ProfileCompletionConflictError) {
      return NextResponse.json({ errorCode: error.code }, { status: 409 });
    }

    return NextResponse.json(
      { errorCode: AUTH_MESSAGE_CODES.UNEXPECTED_COMPLETE_PROFILE_ERROR },
      { status: 500 },
    );
  }
}
