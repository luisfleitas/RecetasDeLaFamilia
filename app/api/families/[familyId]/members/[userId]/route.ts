import { parseFamilyRole, parsePositiveInt } from "@/lib/application/families/validation";
import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
import { countFamilyAdmins, countFamilyMembers, isFamilyAdmin } from "@/lib/families/utils";
import { isPhase3Enabled } from "@/lib/phase3/config";
import { getRequestId, recordAuditEvent, recordMetric, withRequestId } from "@/lib/phase3/observability";
import { getPrisma } from "@/lib/prisma";
import { FamilyRole } from "@prisma/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ familyId: string; userId: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  const requestId = getRequestId(request);
  const authUser = getAuthUserFromRequest(request);

  if (!authUser) {
    return withRequestId(
      NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 }),
      requestId,
    );
  }

  const { familyId: familyIdParam, userId: userIdParam } = await params;
  const familyId = parsePositiveInt(familyIdParam);
  const targetUserId = parsePositiveInt(userIdParam);

  if (!familyId || !targetUserId) {
    return withRequestId(
      NextResponse.json({ error: "Invalid family or user id", code: "VALIDATION_ERROR" }, { status: 400 }),
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

  let nextRole: FamilyRole;
  try {
    nextRole = parseFamilyRole((body as Record<string, unknown>)?.role);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid role";
    return withRequestId(
      NextResponse.json({ error: message, code: "VALIDATION_ERROR" }, { status: 400 }),
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

    const targetMembership = await prisma.familyMembership.findUnique({
      where: {
        familyId_userId: {
          familyId,
          userId: targetUserId,
        },
      },
    });

    if (!targetMembership) {
      return withRequestId(
        NextResponse.json({ error: "Membership not found", code: "NOT_FOUND" }, { status: 404 }),
        requestId,
      );
    }

    if (targetMembership.role === FamilyRole.admin && nextRole === FamilyRole.member) {
      const adminCount = await countFamilyAdmins(prisma, familyId);
      if (adminCount <= 1) {
        return withRequestId(NextResponse.json(
          {
            error: "Cannot demote the last admin",
            code: "ADMIN_INVARIANT_VIOLATION",
          },
          { status: 409 },
        ), requestId);
      }
    }

    const membership = await prisma.familyMembership.update({
      where: { id: targetMembership.id },
      data: {
        role: nextRole,
      },
    });

    if (isPhase3Enabled() && targetMembership.role !== nextRole) {
      await recordAuditEvent(prisma, {
        eventType: "membership_role_changed",
        requestId,
        actorUserId: authUser.userId,
        familyId,
        targetUserId,
        oldRole: targetMembership.role,
        newRole: nextRole,
      });
      await recordMetric(prisma, {
        metricName: "membership_role_updated",
        requestId,
        actorUserId: authUser.userId,
        familyId,
        statusCode: 200,
      });
    }

    return withRequestId(NextResponse.json({ membership }), requestId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while updating member role";
    return withRequestId(NextResponse.json({ error: message }, { status: 500 }), requestId);
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const requestId = getRequestId(request);
  const authUser = getAuthUserFromRequest(request);

  if (!authUser) {
    return withRequestId(
      NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 }),
      requestId,
    );
  }

  const { familyId: familyIdParam, userId: userIdParam } = await params;
  const familyId = parsePositiveInt(familyIdParam);
  const targetUserId = parsePositiveInt(userIdParam);

  if (!familyId || !targetUserId) {
    return withRequestId(
      NextResponse.json({ error: "Invalid family or user id", code: "VALIDATION_ERROR" }, { status: 400 }),
      requestId,
    );
  }

  if (targetUserId === authUser.userId) {
    return withRequestId(NextResponse.json(
      {
        error: "Use leave endpoint to remove yourself",
        code: "VALIDATION_ERROR",
      },
      { status: 400 },
    ), requestId);
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

    const targetMembership = await prisma.familyMembership.findUnique({
      where: {
        familyId_userId: {
          familyId,
          userId: targetUserId,
        },
      },
    });

    if (!targetMembership) {
      return withRequestId(
        NextResponse.json({ error: "Membership not found", code: "NOT_FOUND" }, { status: 404 }),
        requestId,
      );
    }

    const [memberCount, adminCount] = await Promise.all([
      countFamilyMembers(prisma, familyId),
      countFamilyAdmins(prisma, familyId),
    ]);

    if (memberCount <= 1) {
      return withRequestId(NextResponse.json(
        {
          error: "Cannot remove the last member",
          code: "ADMIN_INVARIANT_VIOLATION",
        },
        { status: 409 },
      ), requestId);
    }

    if (targetMembership.role === FamilyRole.admin && adminCount <= 1) {
      return withRequestId(NextResponse.json(
        {
          error: "Cannot remove the last admin",
          code: "ADMIN_INVARIANT_VIOLATION",
        },
        { status: 409 },
      ), requestId);
    }

    await prisma.familyMembership.delete({
      where: {
        id: targetMembership.id,
      },
    });

    if (isPhase3Enabled()) {
      await recordAuditEvent(prisma, {
        eventType: "membership_removed",
        requestId,
        actorUserId: authUser.userId,
        familyId,
        targetUserId,
        oldRole: targetMembership.role,
      });
      await recordMetric(prisma, {
        metricName: "membership_removed",
        requestId,
        actorUserId: authUser.userId,
        familyId,
        statusCode: 200,
      });
    }

    return withRequestId(NextResponse.json({ ok: true }), requestId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while removing member";
    return withRequestId(NextResponse.json({ error: message }, { status: 500 }), requestId);
  }
}
