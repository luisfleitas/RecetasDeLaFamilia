import { parseFamilyRole, parsePositiveInt } from "@/lib/application/families/validation";
import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
import { countFamilyAdmins, countFamilyMembers, isFamilyAdmin } from "@/lib/families/utils";
import { getPrisma } from "@/lib/prisma";
import { FamilyRole } from "@prisma/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ familyId: string; userId: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  const authUser = getAuthUserFromRequest(request);

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { familyId: familyIdParam, userId: userIdParam } = await params;
  const familyId = parsePositiveInt(familyIdParam);
  const targetUserId = parsePositiveInt(userIdParam);

  if (!familyId || !targetUserId) {
    return NextResponse.json({ error: "Invalid family or user id", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  let nextRole: FamilyRole;
  try {
    nextRole = parseFamilyRole((body as Record<string, unknown>)?.role);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid role";
    return NextResponse.json({ error: message, code: "VALIDATION_ERROR" }, { status: 400 });
  }

  try {
    const prisma = await getPrisma();
    const admin = await isFamilyAdmin(prisma, familyId, authUser.userId);
    if (!admin) {
      return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
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
      return NextResponse.json({ error: "Membership not found", code: "NOT_FOUND" }, { status: 404 });
    }

    if (targetMembership.role === FamilyRole.admin && nextRole === FamilyRole.member) {
      const adminCount = await countFamilyAdmins(prisma, familyId);
      if (adminCount <= 1) {
        return NextResponse.json(
          {
            error: "Cannot demote the last admin",
            code: "ADMIN_INVARIANT_VIOLATION",
          },
          { status: 409 },
        );
      }
    }

    const membership = await prisma.familyMembership.update({
      where: { id: targetMembership.id },
      data: {
        role: nextRole,
      },
    });

    return NextResponse.json({ membership });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while updating member role";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const authUser = getAuthUserFromRequest(request);

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { familyId: familyIdParam, userId: userIdParam } = await params;
  const familyId = parsePositiveInt(familyIdParam);
  const targetUserId = parsePositiveInt(userIdParam);

  if (!familyId || !targetUserId) {
    return NextResponse.json({ error: "Invalid family or user id", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  if (targetUserId === authUser.userId) {
    return NextResponse.json(
      {
        error: "Use leave endpoint to remove yourself",
        code: "VALIDATION_ERROR",
      },
      { status: 400 },
    );
  }

  try {
    const prisma = await getPrisma();
    const admin = await isFamilyAdmin(prisma, familyId, authUser.userId);
    if (!admin) {
      return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
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
      return NextResponse.json({ error: "Membership not found", code: "NOT_FOUND" }, { status: 404 });
    }

    const [memberCount, adminCount] = await Promise.all([
      countFamilyMembers(prisma, familyId),
      countFamilyAdmins(prisma, familyId),
    ]);

    if (memberCount <= 1) {
      return NextResponse.json(
        {
          error: "Cannot remove the last member",
          code: "ADMIN_INVARIANT_VIOLATION",
        },
        { status: 409 },
      );
    }

    if (targetMembership.role === FamilyRole.admin && adminCount <= 1) {
      return NextResponse.json(
        {
          error: "Cannot remove the last admin",
          code: "ADMIN_INVARIANT_VIOLATION",
        },
        { status: 409 },
      );
    }

    await prisma.familyMembership.delete({
      where: {
        id: targetMembership.id,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while removing member";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
