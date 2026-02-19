import { AuthConflictError } from "@/lib/application/auth/use-cases";
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
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let input;
  try {
    input = parseRegisterInput(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid registration payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const user = await authUseCases.register(input);
    const { accessToken } = await authUseCases.login({
      username: input.username,
      password: input.password,
    });

    const response = NextResponse.json({ user }, { status: 201 });
    response.cookies.set(ACCESS_TOKEN_COOKIE, accessToken, getAccessTokenCookieConfig());
    return response;
  } catch (error) {
    if (error instanceof AuthConflictError) {
      return NextResponse.json({ error: error.message }, { status: 409 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json({ error: "email or username already in use" }, { status: 409 });
    }

    const message = error instanceof Error ? error.message : "Unexpected error while registering";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
