import { buildAuthProvider } from "@/lib/auth/factory";
import {
  PROFILE_INCOMPLETE_CODE,
  isProfileComplete,
} from "@/lib/auth/profile-completion";
import type { AppAuthUser } from "@/lib/auth/types";
import { NextResponse } from "next/server";

export type CompletedAuthRequestResult =
  | { status: "authenticated"; authUser: AppAuthUser }
  | { status: "unauthenticated" }
  | { status: "profile_incomplete"; response: NextResponse };

export async function getAuthUserFromRequest(request: Request): Promise<AppAuthUser | null> {
  return buildAuthProvider().getAuthUserFromRequest(request);
}

export async function getCompletedAuthUserFromRequest(
  request: Request,
): Promise<CompletedAuthRequestResult> {
  const authUser = await getAuthUserFromRequest(request);

  if (!authUser) {
    return { status: "unauthenticated" };
  }

  if (!isProfileComplete(authUser)) {
    return {
      status: "profile_incomplete",
      response: NextResponse.json(
        { error: "Profile incomplete", code: PROFILE_INCOMPLETE_CODE },
        { status: 409 },
      ),
    };
  }

  return { status: "authenticated", authUser };
}
