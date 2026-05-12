import {
  applyPendingInviteAction,
  DirectInviteError,
  directInviteErrorStatus,
  type PendingInviteAction,
} from "@/lib/application/families/direct-invites";
import { parsePositiveInt } from "@/lib/application/families/validation";
import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
import { getPrisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ inviteId: string }>;
};

function parsePendingInviteAction(body: unknown): PendingInviteAction {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid invite action payload");
  }

  const action = (body as { action?: unknown }).action;
  if (action === "accept" || action === "decline" || action === "undo-decline") {
    return action;
  }

  throw new Error("Invalid invite action");
}

export async function PATCH(request: Request, { params }: Params) {
  const authUser = getAuthUserFromRequest(request);

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { inviteId: inviteIdParam } = await params;
  const inviteId = parsePositiveInt(inviteIdParam);

  if (!inviteId) {
    return NextResponse.json({ error: "Invalid invite id", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  let action: PendingInviteAction;
  try {
    action = parsePendingInviteAction(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid invite action";
    return NextResponse.json({ error: message, code: "VALIDATION_ERROR" }, { status: 400 });
  }

  try {
    const prisma = await getPrisma();
    const result = await applyPendingInviteAction({
      prisma,
      inviteId,
      userId: authUser.userId,
      action,
    });

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof DirectInviteError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: directInviteErrorStatus(error.code) },
      );
    }

    const message = error instanceof Error ? error.message : "Unexpected error while updating invite";
    return NextResponse.json({ error: message, code: "INTERNAL_ERROR" }, { status: 500 });
  }
}
