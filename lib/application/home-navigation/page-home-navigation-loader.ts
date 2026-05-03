import { getPrisma } from "@/lib/prisma";
import type { HomeNavigationFamily } from "@/lib/application/home-navigation/view-model";

export async function loadHomeNavigationFamiliesForPage(userId: number): Promise<HomeNavigationFamily[]> {
  const prisma = await getPrisma();
  const memberships = await prisma.familyMembership.findMany({
    where: { userId },
    include: { family: true },
    orderBy: { joinedAt: "desc" },
  });

  return memberships.map((membership) => ({
    id: membership.family.id,
    name: membership.family.name,
    role: membership.role,
    joinedAt: membership.joinedAt.toISOString(),
  }));
}
