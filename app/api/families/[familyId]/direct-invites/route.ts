import {
  createUsernameDirectInvite,
  DirectInviteError,
  directInviteErrorStatus,
  listUsernameDirectInvitesForFamily,
} from "@/lib/application/families/direct-invites";
import { parsePositiveInt, parseCreateUsernameDirectInviteInput } from "@/lib/application/families/validation";
import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
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
    const invites = await listUsernameDirectInvitesForFamily({
      prisma,
      familyId,
      actorUserId: authUser.userId,
    });

    return withRequestId(NextResponse.json({ invites }), requestId);
  } catch (error) {
    if (error instanceof DirectInviteError) {
      return withRequestId(
        NextResponse.json({ error: error.message, code: error.code }, { status: directInviteErrorStatus(error.code) }),
        requestId,
      );
    }

    const message = error instanceof Error ? error.message : "Unexpected error while listing direct invites";
    return withRequestId(NextResponse.json({ error: message, code: "INTERNAL_ERROR" }, { status: 500 }), requestId);
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return withRequestId(
      NextResponse.json({ error: "Invalid JSON body", code: "VALIDATION_ERROR" }, { status: 400 }),
      requestId,
    );
  }

  let input;
  try {
    input = parseCreateUsernameDirectInviteInput(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid direct invite payload";
    return withRequestId(
      NextResponse.json({ error: message, code: "VALIDATION_ERROR" }, { status: 400 }),
      requestId,
    );
  }

  try {
    const prisma = await getPrisma();

    if (isPhase3Enabled()) {
      const rate = checkRateLimit("direct-invite-create", `${authUser.userId}:${familyId}`, 10, 60 * 60 * 1000);
      if (!rate.allowed) {
        const limitedResponse = NextResponse.json(
          { error: "Too many direct invite creations. Please retry later.", code: "RATE_LIMITED" },
          { status: 429 },
        );
        limitedResponse.headers.set("retry-after", String(rate.retryAfterSeconds));
        return withRequestId(limitedResponse, requestId);
      }
    }

    const origin = new URL(request.url).origin;
    const result = await createUsernameDirectInvite({
      prisma,
      familyId,
      actorUserId: authUser.userId,
      username: input.username,
      origin,
    });

    if (isPhase3Enabled()) {
      await recordMetric(prisma, {
        metricName: "direct_invite_created",
        requestId,
        actorUserId: authUser.userId,
        familyId,
        inviteId: result.invite.id,
        statusCode: 201,
        metadata: { targetUserId: result.invite.targetUserId },
      });
    }

    return withRequestId(NextResponse.json(result, { status: 201 }), requestId);
  } catch (error) {
    if (error instanceof DirectInviteError) {
      return withRequestId(
        NextResponse.json({ error: error.message, code: error.code }, { status: directInviteErrorStatus(error.code) }),
        requestId,
      );
    }

    const message = error instanceof Error ? error.message : "Unexpected error while creating direct invite";
    return withRequestId(NextResponse.json({ error: message, code: "INTERNAL_ERROR" }, { status: 500 }), requestId);
  }
}
