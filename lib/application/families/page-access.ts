export type FamilyPageMembership = {
  familyId: number;
  userId: number;
  role: "admin" | "member";
};

export type FamilyPageAccess =
  | { kind: "redirect"; href: "/" }
  | { kind: "not-found" }
  | { kind: "edit"; role: "admin" }
  | { kind: "view"; role: "member" };

export function resolveFamilyPageAccess(input: {
  authUserId: number | null;
  membership: FamilyPageMembership | null;
}): FamilyPageAccess {
  if (!input.authUserId) {
    return { kind: "redirect", href: "/" };
  }

  if (!input.membership) {
    return { kind: "not-found" };
  }

  if (input.membership.role === "admin") {
    return { kind: "edit", role: "admin" };
  }

  return { kind: "view", role: "member" };
}
