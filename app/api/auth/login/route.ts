import { AUTH_MESSAGE_CODES, AuthInvalidCredentialsError, AuthValidationError } from "@/lib/application/auth/errors";
import { parseLoginInput } from "@/lib/application/auth/validation";
import { buildAuthUseCases } from "@/lib/auth/factory";
import { ACCESS_TOKEN_COOKIE, getAccessTokenCookieConfig } from "@/lib/auth/session-cookie";
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
    input = parseLoginInput(body);
  } catch (error) {
    const errorCode =
      error instanceof AuthValidationError ? error.code : AUTH_MESSAGE_CODES.INVALID_LOGIN_PAYLOAD;
    return NextResponse.json({ errorCode }, { status: 400 });
  }

  try {
    const { accessToken } = await authUseCases.login(input);
    const response = NextResponse.json({ access_token: accessToken });
    response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, getAccessTokenCookieConfig());
    return response;
  } catch (error) {
    if (error instanceof AuthInvalidCredentialsError) {
      return NextResponse.json({ errorCode: error.code }, { status: 401 });
    }

    return NextResponse.json({ errorCode: AUTH_MESSAGE_CODES.UNEXPECTED_LOGIN_ERROR }, { status: 500 });
  }
}
