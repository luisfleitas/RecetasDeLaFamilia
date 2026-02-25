import { parsePositiveInt } from "@/lib/application/families/validation";
import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
import { countFamilyAdmins, countFamilyMembers, getFamilyMembership } from "@/lib/families/utils";
import { getPrisma } from "@/lib/prisma";
import { FamilyRole } from "@prisma/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Params = {
  params: Promise<{ familyId: string }>;
};

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
      return NextResponse.json({ error: "Membership not found", code: "NOT_FOUND" }, { status: 404 });
    }

    const [memberCount, adminCount] = await Promise.all([
      countFamilyMembers(prisma, familyId),
      countFamilyAdmins(prisma, familyId),
    ]);

    if (memberCount === 1) {
      if (!confirmDelete) {
        return NextResponse.json(
          {
            error: "Confirm delete is required for sole-member leave",
            code: "VALIDATION_ERROR",
          },
          { status: 400 },
        );
      }

      await prisma.family.delete({
        where: {
          id: familyId,
        },
      });

      return NextResponse.json({ ok: true, deletedFamily: true });
    }

    if (membership.role === FamilyRole.admin && adminCount <= 1) {
      return NextResponse.json(
        {
          error: "Cannot leave as the last admin while members remain",
          code: "ADMIN_INVARIANT_VIOLATION",
        },
        { status: 409 },
      );
    }

    await prisma.familyMembership.delete({
      where: {
        id: membership.id,
      },
    });

    return NextResponse.json({ ok: true, deletedFamily: false });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while leaving family";

    if (message.includes("Record to delete does not exist")) {
      return NextResponse.json({ error: "Family not found", code: "NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
