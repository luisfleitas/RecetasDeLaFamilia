import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
import { hashFamilyInviteToken } from "@/lib/families/utils";
import { getPrisma } from "@/lib/prisma";
import { FamilyInviteDecisionStatus } from "@prisma/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ token: string }>;
};

export async function POST(request: Request, { params }: Params) {
  const authUser = getAuthUserFromRequest(request);

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { token } = await params;
  if (!token || token.length < 10) {
    return NextResponse.json({ error: "Invalid invite token", code: "INVITE_INVALID" }, { status: 400 });
  }

  try {
    const prisma = await getPrisma();
    const tokenHash = hashFamilyInviteToken(token);

    const invite = await prisma.familyInvite.findUnique({
      where: {
        tokenHash,
      },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invalid invite token", code: "INVITE_INVALID" }, { status: 400 });
    }

    const decision = await prisma.familyInviteDecision.findUnique({
      where: {
        inviteId_userId: {
          inviteId: invite.id,
          userId: authUser.userId,
        },
      },
    });

    if (!decision) {
      return NextResponse.json(
        {
          error: "Invite must be opened before it can be declined",
          code: "VALIDATION_ERROR",
        },
        { status: 400 },
      );
    }

    const updated = await prisma.familyInviteDecision.update({
      where: {
        id: decision.id,
      },
      data: {
        status: FamilyInviteDecisionStatus.declined,
        decidedAt: new Date(),
      },
    });

    return NextResponse.json({ decision: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while declining invite";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
