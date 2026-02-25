import { parsePositiveInt } from "@/lib/application/families/validation";
import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
import { getInviteState, isFamilyAdmin } from "@/lib/families/utils";
import { getPrisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ familyId: string; inviteId: string }>;
};

export async function DELETE(request: Request, { params }: Params) {
  const authUser = getAuthUserFromRequest(request);

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { familyId: familyIdParam, inviteId: inviteIdParam } = await params;
  const familyId = parsePositiveInt(familyIdParam);
  const inviteId = parsePositiveInt(inviteIdParam);

  if (!familyId || !inviteId) {
    return NextResponse.json({ error: "Invalid family or invite id", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  try {
    const prisma = await getPrisma();
    const admin = await isFamilyAdmin(prisma, familyId, authUser.userId);

    if (!admin) {
      return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
    }

    const invite = await prisma.familyInvite.findFirst({
      where: {
        id: inviteId,
        familyId,
      },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invite not found", code: "NOT_FOUND" }, { status: 404 });
    }

    const nextInvite = invite.revokedAt
      ? invite
      : await prisma.familyInvite.update({
          where: { id: invite.id },
          data: { revokedAt: new Date() },
        });

    return NextResponse.json({
      invite: {
        id: nextInvite.id,
        familyId: nextInvite.familyId,
        createdByUserId: nextInvite.createdByUserId,
        createdAt: nextInvite.createdAt,
        expiresAt: nextInvite.expiresAt,
        revokedAt: nextInvite.revokedAt,
        consumedAt: nextInvite.consumedAt,
        consumedByUserId: nextInvite.consumedByUserId,
        state: getInviteState(nextInvite),
      },
      idempotent: Boolean(invite.revokedAt),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while revoking invite";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
