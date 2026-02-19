import { AuthInvalidCredentialsError } from "@/lib/application/auth/use-cases";
import { parseChangePasswordInput } from "@/lib/application/auth/validation";
import { buildAuthUseCases } from "@/lib/auth/factory";
import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

const authUseCases = buildAuthUseCases();

export async function POST(request: Request) {
  const authUser = getAuthUserFromRequest(request);

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  let input;
  try {
    input = parseChangePasswordInput(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid payload";
    return NextResponse.json({ error: message }, { status: 400 });
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
      return NextResponse.json({ error: error.message }, { status: 401 });
    }

    const message = error instanceof Error ? error.message : "Unexpected error while changing password";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
