import { parsePositiveInt } from "@/lib/application/families/validation";
import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
import {
  createFamilyInviteToken,
  getInviteExpiryDate,
  getInviteState,
  hashFamilyInviteToken,
  isFamilyAdmin,
} from "@/lib/families/utils";
import { isPhase3Enabled } from "@/lib/phase3/config";
import { getRequestId, recordMetric, withRequestId } from "@/lib/phase3/observability";
import { checkRateLimit } from "@/lib/phase3/rate-limit";
import { getPrisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ familyId: string }>;
};

export async function GET(request: Request, { params }: Params) {
  const requestId = getRequestId(request);
  const authUser = getAuthUserFromRequest(request);

  if (!authUser) {
    return withRequestId(
      NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 }),
      requestId,
    );
  }

  const { familyId: familyIdParam } = await params;
  const familyId = parsePositiveInt(familyIdParam);

  if (!familyId) {
    return withRequestId(
      NextResponse.json({ error: "Invalid family id", code: "VALIDATION_ERROR" }, { status: 400 }),
      requestId,
    );
  }

  try {
    const prisma = await getPrisma();
    const admin = await isFamilyAdmin(prisma, familyId, authUser.userId);

    if (!admin) {
      return withRequestId(
        NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 }),
        requestId,
      );
    }

    const invites = await prisma.familyInvite.findMany({
      where: {
        familyId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return withRequestId(NextResponse.json({
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
    }), requestId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while listing invite links";
    return withRequestId(NextResponse.json({ error: message }, { status: 500 }), requestId);
  }
}

export async function POST(request: Request, { params }: Params) {
  const requestId = getRequestId(request);
  const authUser = getAuthUserFromRequest(request);

  if (!authUser) {
    return withRequestId(
      NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 }),
      requestId,
    );
  }

  const { familyId: familyIdParam } = await params;
  const familyId = parsePositiveInt(familyIdParam);

  if (!familyId) {
    return withRequestId(
      NextResponse.json({ error: "Invalid family id", code: "VALIDATION_ERROR" }, { status: 400 }),
      requestId,
    );
  }

  try {
    const prisma = await getPrisma();
    const admin = await isFamilyAdmin(prisma, familyId, authUser.userId);

    if (!admin) {
      return withRequestId(
        NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 }),
        requestId,
      );
    }

    if (isPhase3Enabled()) {
      const rate = checkRateLimit("invite-create", `${authUser.userId}:${familyId}`, 10, 60 * 60 * 1000);
      if (!rate.allowed) {
        const limitedResponse = NextResponse.json(
          { error: "Too many invite creations. Please retry later.", code: "RATE_LIMITED" },
          { status: 429 },
        );
        limitedResponse.headers.set("retry-after", String(rate.retryAfterSeconds));
        return withRequestId(limitedResponse, requestId);
      }
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
    if (isPhase3Enabled()) {
      await recordMetric(prisma, {
        metricName: "invite_created",
        requestId,
        actorUserId: authUser.userId,
        familyId,
        inviteId: invite.id,
        statusCode: 201,
      });
    }

    return withRequestId(
      NextResponse.json(
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
    ),
      requestId,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while creating invite link";
    return withRequestId(NextResponse.json({ error: message }, { status: 500 }), requestId);
  }
}
