import { parsePositiveInt, parseUpdateFamilyInput } from "@/lib/application/families/validation";
import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
import { buildFamilyPictureUrl, isFamilyAdmin } from "@/lib/families/utils";
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
    const membership = await prisma.familyMembership.findUnique({
      where: {
        familyId_userId: {
          familyId,
          userId: authUser.userId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
    }

    const family = await prisma.family.findUnique({
      where: { id: familyId },
      include: {
        memberships: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
        },
      },
    });

    if (!family) {
      return NextResponse.json({ error: "Family not found", code: "NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({
      family: {
        id: family.id,
        name: family.name,
        description: family.description,
        pictureStorageKey: family.pictureStorageKey,
        pictureUrl: buildFamilyPictureUrl(family.pictureStorageKey),
        createdAt: family.createdAt,
        updatedAt: family.updatedAt,
        createdByUserId: family.createdByUserId,
        currentUserRole: membership.role,
        members: family.memberships.map((item) => ({
          userId: item.userId,
          role: item.role,
          joinedAt: item.joinedAt,
          username: item.user.username,
          firstName: item.user.firstName,
          lastName: item.user.lastName,
        })),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while fetching family";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: Params) {
  const authUser = getAuthUserFromRequest(request);

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { familyId: familyIdParam } = await params;
  const familyId = parsePositiveInt(familyIdParam);

  if (!familyId) {
    return NextResponse.json({ error: "Invalid family id", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  let input;
  try {
    input = parseUpdateFamilyInput(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid family payload";
    return NextResponse.json({ error: message, code: "VALIDATION_ERROR" }, { status: 400 });
  }

  try {
    const prisma = await getPrisma();
    const admin = await isFamilyAdmin(prisma, familyId, authUser.userId);

    if (!admin) {
      return NextResponse.json({ error: "Forbidden", code: "FORBIDDEN" }, { status: 403 });
    }

    const family = await prisma.family.update({
      where: { id: familyId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.pictureStorageKey !== undefined
          ? { pictureStorageKey: input.pictureStorageKey }
          : {}),
      },
    });

    return NextResponse.json({
      family: {
        id: family.id,
        name: family.name,
        description: family.description,
        pictureStorageKey: family.pictureStorageKey,
        pictureUrl: buildFamilyPictureUrl(family.pictureStorageKey),
        createdAt: family.createdAt,
        updatedAt: family.updatedAt,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while updating family";

    if (message.includes("Record to update not found")) {
      return NextResponse.json({ error: "Family not found", code: "NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
