import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
import {
  buildFamilyPictureUrl,
  getInviteState,
  hashFamilyInviteToken,
} from "@/lib/families/utils";
import { getPrisma } from "@/lib/prisma";
import { FamilyInviteDecisionStatus } from "@prisma/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ token: string }>;
};

export async function GET(request: Request, { params }: Params) {
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
      include: {
        family: true,
      },
    });

    if (!invite) {
      return NextResponse.json({ error: "Invalid invite token", code: "INVITE_INVALID" }, { status: 400 });
    }

    const membership = await prisma.familyMembership.findUnique({
      where: {
        familyId_userId: {
          familyId: invite.familyId,
          userId: authUser.userId,
        },
      },
    });

    const state = membership ? "already_member" : getInviteState(invite);

    const decision = await prisma.familyInviteDecision.upsert({
      where: {
        inviteId_userId: {
          inviteId: invite.id,
          userId: authUser.userId,
        },
      },
      create: {
        inviteId: invite.id,
        userId: authUser.userId,
        status: FamilyInviteDecisionStatus.pending,
      },
      update: {
        lastOpenedAt: new Date(),
      },
    });

    return NextResponse.json({
      invite: {
        id: invite.id,
        familyId: invite.familyId,
        state,
        expiresAt: invite.expiresAt,
        revokedAt: invite.revokedAt,
        consumedAt: invite.consumedAt,
        family: {
          id: invite.family.id,
          name: invite.family.name,
          description: invite.family.description,
          pictureStorageKey: invite.family.pictureStorageKey,
          pictureUrl: buildFamilyPictureUrl(invite.family.pictureStorageKey),
        },
        decision: {
          status: decision.status,
          firstOpenedAt: decision.firstOpenedAt,
          lastOpenedAt: decision.lastOpenedAt,
          decidedAt: decision.decidedAt,
        },
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while resolving invite";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
