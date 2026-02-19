import { AuthInvalidCredentialsError } from "@/lib/application/auth/use-cases";
import { parseLoginInput } from "@/lib/application/auth/validation";
import { buildAuthUseCases } from "@/lib/auth/factory";
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
    input = parseLoginInput(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid login payload";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const { accessToken } = await authUseCases.login(input);
    return NextResponse.json({ access_token: accessToken });
  } catch (error) {
    if (error instanceof AuthInvalidCredentialsError) {
      return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
    }

    const message = error instanceof Error ? error.message : "Unexpected error while logging in";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
