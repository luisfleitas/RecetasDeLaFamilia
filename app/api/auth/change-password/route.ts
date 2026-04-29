import { AUTH_MESSAGE_CODES, AuthInvalidCredentialsError, AuthValidationError } from "@/lib/application/auth/errors";
import { parseChangePasswordInput } from "@/lib/application/auth/validation";
import { buildAuthUseCases } from "@/lib/auth/factory";
import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const authUseCases = buildAuthUseCases();

export async function POST(request: Request) {
  const authUser = getAuthUserFromRequest(request);

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
    input = parseChangePasswordInput(body);
  } catch (error) {
    const errorCode =
      error instanceof AuthValidationError ? error.code : AUTH_MESSAGE_CODES.INVALID_CHANGE_PASSWORD_PAYLOAD;
    return NextResponse.json({ errorCode }, { status: 400 });
  }

  try {
    await authUseCases.changePassword({
      userId: authUser.userId,
      currentPassword: input.currentPassword,
      newPassword: input.newPassword,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthInvalidCredentialsError) {
      return NextResponse.json({ errorCode: error.code }, { status: 401 });
    }

    return NextResponse.json({ errorCode: AUTH_MESSAGE_CODES.UNEXPECTED_CHANGE_PASSWORD_ERROR }, { status: 500 });
  }
}
