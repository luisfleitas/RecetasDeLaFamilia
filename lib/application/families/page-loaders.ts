import { resolveFamilyPageAccess, type FamilyPageAccess } from "@/lib/application/families/page-access";
import { buildFamilyPictureUrl } from "@/lib/families/utils";
import { getPrisma } from "@/lib/prisma";

export type FamilyEditPageMember = {
  userId: number;
  role: "admin" | "member";
  joinedAt: string;
  username: string;
  firstName: string;
  lastName: string;
};

export type FamilyEditPageFamily = {
  id: number;
  name: string;
  description: string | null;
  pictureStorageKey: string | null;
  pictureUrl: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUserId: number;
  currentUserId: number;
  currentUserRole: "admin" | "member";
  members: FamilyEditPageMember[];
};

export type FamilyEditPageData = {
  access: FamilyPageAccess;
  family: FamilyEditPageFamily | null;
};

export async function loadFamilyForEditPage(input: {
  familyId: number;
  authUserId: number | null;
}): Promise<FamilyEditPageData> {
  if (!input.authUserId) {
    return { access: resolveFamilyPageAccess({ authUserId: null, membership: null }), family: null };
  }

  const prisma = await getPrisma();
  const membership = await prisma.familyMembership.findUnique({
    where: {
      familyId_userId: {
        familyId: input.familyId,
        userId: input.authUserId,
      },
    },
  });
  const access = resolveFamilyPageAccess({ authUserId: input.authUserId, membership });

  if (access.kind === "not-found") {
    return { access, family: null };
  }

  const family = await prisma.family.findUnique({
    where: { id: input.familyId },
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
    return { access: { kind: "not-found" }, family: null };
  }

  return {
    access,
    family: {
      id: family.id,
      name: family.name,
      description: family.description,
      pictureStorageKey: family.pictureStorageKey,
      pictureUrl: buildFamilyPictureUrl(family.pictureStorageKey),
      createdAt: family.createdAt.toISOString(),
      updatedAt: family.updatedAt.toISOString(),
      createdByUserId: family.createdByUserId,
      currentUserId: input.authUserId,
      currentUserRole: membership!.role,
      members: family.memberships.map((item) => ({
        userId: item.userId,
        role: item.role,
        joinedAt: item.joinedAt.toISOString(),
        username: item.user.username,
        firstName: item.user.firstName,
        lastName: item.user.lastName,
      })),
    },
  };
}
