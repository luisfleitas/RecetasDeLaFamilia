import { parseCreateFamilyInput } from "@/lib/application/families/validation";
import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
import { buildFamilyPictureUrl } from "@/lib/families/utils";
import { getPrisma } from "@/lib/prisma";
import { FamilyRole } from "@prisma/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authUser = getAuthUserFromRequest(request);

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const prisma = await getPrisma();
    const memberships = await prisma.familyMembership.findMany({
      where: { userId: authUser.userId },
      include: {
        family: true,
      },
      orderBy: {
        joinedAt: "desc",
      },
    });

    const families = memberships.map((membership) => ({
      id: membership.family.id,
      name: membership.family.name,
      description: membership.family.description,
      pictureStorageKey: membership.family.pictureStorageKey,
      pictureUrl: buildFamilyPictureUrl(membership.family.pictureStorageKey),
      createdAt: membership.family.createdAt,
      updatedAt: membership.family.updatedAt,
      role: membership.role,
      joinedAt: membership.joinedAt,
    }));

    return NextResponse.json({ families });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while listing families";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const authUser = getAuthUserFromRequest(request);

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  let input;
  try {
    input = parseCreateFamilyInput(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid family payload";
    return NextResponse.json({ error: message, code: "VALIDATION_ERROR" }, { status: 400 });
  }

  try {
    const prisma = await getPrisma();
    const family = await prisma.$transaction(async (tx) => {
      const createdFamily = await tx.family.create({
        data: {
          name: input.name,
          description: input.description,
          pictureStorageKey: input.pictureStorageKey,
          createdByUserId: authUser.userId,
        },
      });

      await tx.familyMembership.create({
        data: {
          familyId: createdFamily.id,
          userId: authUser.userId,
          role: FamilyRole.admin,
        },
      });

      return createdFamily;
    });

    return NextResponse.json(
      {
        family: {
          id: family.id,
          name: family.name,
          description: family.description,
          pictureStorageKey: family.pictureStorageKey,
          pictureUrl: buildFamilyPictureUrl(family.pictureStorageKey),
          createdAt: family.createdAt,
          updatedAt: family.updatedAt,
          role: FamilyRole.admin,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while creating family";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
