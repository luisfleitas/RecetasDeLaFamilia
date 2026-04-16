import { parsePositiveInt } from "@/lib/application/families/validation";
import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
import { countFamilyAdmins, countFamilyMembers, getFamilyMembership } from "@/lib/families/utils";
import { isPhase3Enabled } from "@/lib/phase3/config";
import { getRequestId, recordAuditEvent, recordMetric, withRequestId } from "@/lib/phase3/observability";
import { getPrisma } from "@/lib/prisma";
import { FamilyRole } from "@prisma/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ familyId: string }>;
};

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

  let confirmDelete = false;
  try {
    const body = (await request.json()) as { confirmDelete?: boolean };
    confirmDelete = Boolean(body?.confirmDelete);
  } catch {
    confirmDelete = false;
  }

  try {
    const prisma = await getPrisma();
    const membership = await getFamilyMembership(prisma, familyId, authUser.userId);

    if (!membership) {
      return withRequestId(
        NextResponse.json({ error: "Membership not found", code: "NOT_FOUND" }, { status: 404 }),
        requestId,
      );
    }

    const [memberCount, adminCount] = await Promise.all([
      countFamilyMembers(prisma, familyId),
      countFamilyAdmins(prisma, familyId),
    ]);

    if (memberCount === 1) {
      if (!confirmDelete) {
        return withRequestId(NextResponse.json(
          {
            error: "Confirm delete is required for sole-member leave",
            code: "VALIDATION_ERROR",
          },
          { status: 400 },
        ), requestId);
      }

      if (isPhase3Enabled()) {
        await recordAuditEvent(prisma, {
          eventType: "family_deleted_via_sole_member_leave",
          requestId,
          actorUserId: authUser.userId,
          familyId: null,
          targetUserId: authUser.userId,
          oldRole: membership.role,
          metadata: { deletedFamilyId: familyId },
        });
        await recordMetric(prisma, {
          metricName: "family_deleted_via_sole_member_leave",
          requestId,
          actorUserId: authUser.userId,
          familyId,
          statusCode: 200,
        });
      }

      await prisma.family.delete({
        where: {
          id: familyId,
        },
      });

      return withRequestId(NextResponse.json({ ok: true, deletedFamily: true }), requestId);
    }

    if (membership.role === FamilyRole.admin && adminCount <= 1) {
      return withRequestId(NextResponse.json(
        {
          error: "Cannot leave as the last admin while members remain",
          code: "ADMIN_INVARIANT_VIOLATION",
        },
        { status: 409 },
      ), requestId);
    }

    await prisma.familyMembership.delete({
      where: {
        id: membership.id,
      },
    });

    if (isPhase3Enabled()) {
      await recordAuditEvent(prisma, {
        eventType: "membership_left",
        requestId,
        actorUserId: authUser.userId,
        familyId,
        targetUserId: authUser.userId,
        oldRole: membership.role,
      });
      await recordMetric(prisma, {
        metricName: "membership_left",
        requestId,
        actorUserId: authUser.userId,
        familyId,
        statusCode: 200,
      });
    }

    return withRequestId(NextResponse.json({ ok: true, deletedFamily: false }), requestId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while leaving family";

    if (message.includes("Record to delete does not exist")) {
      return withRequestId(
        NextResponse.json({ error: "Family not found", code: "NOT_FOUND" }, { status: 404 }),
        requestId,
      );
    }

    return withRequestId(NextResponse.json({ error: message }, { status: 500 }), requestId);
  }
}
