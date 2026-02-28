import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
import { buildFamilyPictureUrl, getInviteState } from "@/lib/families/utils";
import { getPrisma } from "@/lib/prisma";
import { FamilyInviteDecisionStatus } from "@prisma/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authUser = getAuthUserFromRequest(request);

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const status = statusParam === "pending" ? FamilyInviteDecisionStatus.pending : null;

  try {
    const prisma = await getPrisma();
    const decisions = await prisma.familyInviteDecision.findMany({
      where: {
        userId: authUser.userId,
        ...(status ? { status } : {}),
      },
      include: {
        invite: {
          include: {
            family: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });

    const invites = decisions
      .map((decision) => {
        const inviteState = getInviteState(decision.invite);

        if (status === FamilyInviteDecisionStatus.pending && inviteState !== "active") {
          return null;
        }

        return {
          inviteId: decision.inviteId,
          decisionStatus: decision.status,
          firstOpenedAt: decision.firstOpenedAt,
          lastOpenedAt: decision.lastOpenedAt,
          decidedAt: decision.decidedAt,
          invite: {
            id: decision.invite.id,
            familyId: decision.invite.familyId,
            createdAt: decision.invite.createdAt,
            expiresAt: decision.invite.expiresAt,
            state: inviteState,
          },
          family: {
            id: decision.invite.family.id,
            name: decision.invite.family.name,
            description: decision.invite.family.description,
            pictureStorageKey: decision.invite.family.pictureStorageKey,
            pictureUrl: buildFamilyPictureUrl(decision.invite.family.pictureStorageKey),
          },
        };
      })
      .filter((item) => item !== null);

    return NextResponse.json({ invites });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while listing pending invites";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
