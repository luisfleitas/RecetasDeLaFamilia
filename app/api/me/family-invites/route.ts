import { getAuthUserFromRequest } from "@/lib/auth/request-auth";
import { listPendingInvitesForUser } from "@/lib/application/families/direct-invites";
import { getPrisma } from "@/lib/prisma";
import { FamilyInviteDecisionStatus } from "@prisma/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authUser = getAuthUserFromRequest(request);

  if (!authUser) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const statusParam = searchParams.get("status");
  const status = statusParam === "pending" ? FamilyInviteDecisionStatus.pending : null;

  try {
    const prisma = await getPrisma();
    const invites = await listPendingInvitesForUser({
      prisma,
      userId: authUser.userId,
      status,
    });

    return NextResponse.json({ invites });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error while listing pending invites";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
