import { parsePositiveInt } from "@/lib/application/families/validation";
import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
import {
  createFamilyInviteToken,
  getInviteExpiryDate,
  getInviteState,
  hashFamilyInviteToken,
  isFamilyAdmin,
} from "@/lib/families/utils";
import { getPrisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ familyId: string }>;
};

export async function GET(request: Request, { params }: Params) {
  const authUser = getAuthUserFromRequest(request);

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { familyId: familyIdParam } = await params;
  const familyId = parsePositiveInt(familyIdParam);

  if (!familyId) {
    return NextResponse.json({ error: "Invalid family id", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  try {
    const prisma = await getPrisma();
    const admin = await isFamilyAdmin(prisma, familyId, authUser.userId);

    if (!admin) {
      return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
    }

    const invites = await prisma.familyInvite.findMany({
      where: {
        familyId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      invites: invites.map((invite) => ({
        id: invite.id,
        familyId: invite.familyId,
        createdByUserId: invite.createdByUserId,
        createdAt: invite.createdAt,
        expiresAt: invite.expiresAt,
        revokedAt: invite.revokedAt,
        consumedAt: invite.consumedAt,
        consumedByUserId: invite.consumedByUserId,
        state: getInviteState(invite),
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while listing invite links";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: Params) {
  const authUser = getAuthUserFromRequest(request);

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { familyId: familyIdParam } = await params;
  const familyId = parsePositiveInt(familyIdParam);

  if (!familyId) {
    return NextResponse.json({ error: "Invalid family id", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  try {
    const prisma = await getPrisma();
    const admin = await isFamilyAdmin(prisma, familyId, authUser.userId);

    if (!admin) {
      return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
    }

    const token = createFamilyInviteToken();
    const tokenHash = hashFamilyInviteToken(token);
    const expiresAt = getInviteExpiryDate();

    const invite = await prisma.familyInvite.create({
      data: {
        familyId,
        tokenHash,
        createdByUserId: authUser.userId,
        expiresAt,
        maxUses: 1,
      },
    });

    const origin = new URL(request.url).origin;
    return NextResponse.json(
      {
        invite: {
          id: invite.id,
          familyId: invite.familyId,
          createdByUserId: invite.createdByUserId,
          createdAt: invite.createdAt,
          expiresAt: invite.expiresAt,
          state: getInviteState(invite),
          inviteUrl: `${origin}/invite/family/${token}`,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while creating invite link";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
