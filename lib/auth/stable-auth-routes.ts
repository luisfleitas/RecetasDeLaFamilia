type QueryValue = string | string[] | undefined;

export type StableAuthSearchParams = Record<string, QueryValue>;

export function buildClerkAuthRedirectPath(
  clerkPath: "/sign-in" | "/sign-up",
  searchParams: StableAuthSearchParams,
): string {
  const nextPath = getSafeRelativeNext(searchParams.next);
  if (!nextPath) {
    return clerkPath;
  }

  const params = new URLSearchParams({ redirect_url: nextPath });
  return `${clerkPath}?${params.toString()}`;
}

export function getSafeRelativeNext(value: QueryValue): string | null {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (!rawValue || !rawValue.startsWith("/") || rawValue.startsWith("//")) {
    return null;
  }

  return rawValue.includes("\\") ? null : rawValue;
}
