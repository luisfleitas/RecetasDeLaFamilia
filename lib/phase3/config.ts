export function isPhase3Enabled(): boolean {
  const raw = process.env.FEATURE_FAMILY_SHARING_PHASE3 ?? process.env.familySharingPhase3;

  if (raw == null) {
    return true;
  }

  const normalized = raw.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}
