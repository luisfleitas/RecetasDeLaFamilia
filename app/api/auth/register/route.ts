import { AUTH_MESSAGE_CODES, AuthConflictError, AuthValidationError } from "@/lib/application/auth/errors";
import { parseRegisterInput } from "@/lib/application/auth/validation";
import { buildAuthUseCases } from "@/lib/auth/factory";
import { ACCESS_TOKEN_COOKIE, getAccessTokenCookieConfig } from "@/lib/auth/session-cookie";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const authUseCases = buildAuthUseCases();

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ errorCode: AUTH_MESSAGE_CODES.INVALID_JSON_BODY }, { status: 400 });
  }

  let input;
  try {
    input = parseRegisterInput(body);
  } catch (error) {
    const errorCode =
      error instanceof AuthValidationError ? error.code : AUTH_MESSAGE_CODES.INVALID_REGISTRATION_PAYLOAD;
    return NextResponse.json({ errorCode }, { status: 400 });
  }

  try {
    const user = await authUseCases.register(input);
    const { accessToken } = await authUseCases.login({
      usernameOrEmail: input.username,
      password: input.password,
    });

    const response = NextResponse.json({ user }, { status: 201 });
    response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, getAccessTokenCookieConfig());
    return response;
  } catch (error) {
    if (error instanceof AuthConflictError) {
      return NextResponse.json({ errorCode: error.code }, { status: 409 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ errorCode: AUTH_MESSAGE_CODES.EMAIL_OR_USERNAME_IN_USE }, { status: 409 });
    }

    return NextResponse.json({ errorCode: AUTH_MESSAGE_CODES.UNEXPECTED_REGISTER_ERROR }, { status: 500 });
  }
}
