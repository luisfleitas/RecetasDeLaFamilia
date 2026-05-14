import { submitCreateFamily } from "@/lib/application/families/create-family-submission";
import { parseCreateFamilyInput } from "@/lib/application/families/validation";
import { getCompletedAuthUserFromRequest } from "@/lib/auth/request-auth";
import { buildFamilyPictureUrl } from "@/lib/families/utils";
import { isPhase3Enabled } from "@/lib/phase3/config";
import { getRequestId, recordMetric, withRequestId } from "@/lib/phase3/observability";
import { getPrisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = getRequestId(request);
  const authResult = await getCompletedAuthUserFromRequest(request);


  if (authResult.status === "unauthenticated") {
    return withRequestId(
      NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 }),
      requestId,
    );

  }

  if (authResult.status === "profile_incomplete") {

    return authResult.response;

  }

  const authUser = authResult.authUser;

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

    return withRequestId(NextResponse.json({ families }), requestId);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while listing families";
    return withRequestId(NextResponse.json({ error: message, code: "INTERNAL_ERROR" }, { status: 500 }), requestId);
  }
}

export async function POST(request: Request) {
  const requestId = getRequestId(request);
  const authResult = await getCompletedAuthUserFromRequest(request);


  if (authResult.status === "unauthenticated") {
    return withRequestId(
      NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 }),
      requestId,
    );

  }

  if (authResult.status === "profile_incomplete") {

    return authResult.response;

  }

  const authUser = authResult.authUser;

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
    input = parseCreateFamilyInput(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid family payload";
    return withRequestId(
      NextResponse.json({ error: message, code: "VALIDATION_ERROR" }, { status: 400 }),
      requestId,
    );
  }

  try {
    const prisma = await getPrisma();
    const result = await submitCreateFamily({
      prisma,
      actorUserId: authUser.userId,
      input,
      origin: new URL(request.url).origin,
    });

    if (isPhase3Enabled()) {
      await recordMetric(prisma, {
        metricName: "family_created",
        requestId,
        actorUserId: authUser.userId,
        familyId: result.family.id,
        statusCode: 201,
      });
    }

    return withRequestId(
      NextResponse.json(
      {
        family: {
          id: result.family.id,
          name: result.family.name,
          description: result.family.description,
          pictureStorageKey: result.family.pictureStorageKey,
          pictureUrl: buildFamilyPictureUrl(result.family.pictureStorageKey),
          createdAt: result.family.createdAt,
          updatedAt: result.family.updatedAt,
          role: result.family.role,
        },
        completion: result.completion,
      },
      { status: 201 },
    ),
      requestId,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while creating family";
    return withRequestId(NextResponse.json({ error: message, code: "INTERNAL_ERROR" }, { status: 500 }), requestId);
  }
}
