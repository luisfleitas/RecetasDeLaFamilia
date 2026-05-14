import { getCompletedAuthUserFromRequest } from "@/lib/auth/request-auth";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authResult = await getCompletedAuthUserFromRequest(request);


  if (authResult.status === "unauthenticated") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  }

  if (authResult.status === "profile_incomplete") {

    return authResult.response;

  }

  const authUser = authResult.authUser;

  return NextResponse.json({
    user: {
      user_id: authUser.userId,
      username: authUser.username,
    },
  });
}
