const USERNAME_MIN_LENGTH = 3;
const USERNAME_MAX_LENGTH = 32;

export function normalizeUsernameCandidate(value: string | null | undefined): string | null {
  const normalized = (value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, USERNAME_MAX_LENGTH)
    .replace(/-+$/g, "");

  if (normalized.length < USERNAME_MIN_LENGTH) {
    return null;
  }

  return normalized;
}

export function buildUsernameCandidates(input: {
  username?: string | null;
  primaryEmail: string;
  firstName?: string | null;
  lastName?: string | null;
}): string[] {
  const emailLocalPart = input.primaryEmail.split("@")[0] ?? "";
  const candidates = [
    input.username,
    emailLocalPart,
    [input.firstName, input.lastName].filter(Boolean).join(" "),
  ];

  return [...new Set(candidates.map(normalizeUsernameCandidate).filter(Boolean))] as string[];
}

export function buildReservedClerkUsername(providerUserId: string): string {
  const suffix = normalizeUsernameCandidate(providerUserId) ?? "user";
  return `clerk-user-${suffix}`.slice(0, USERNAME_MAX_LENGTH).replace(/-+$/g, "");
}
