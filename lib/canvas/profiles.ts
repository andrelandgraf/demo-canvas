/** One entry of `profile.info_cache` in Chrome's `Local State`, keyed by profile directory. */
export interface ChromeProfile {
  name?: string;
  user_name?: string;
}

/**
 * The profile directory (like "Profile 2") for `query`, matched against the
 * directory, the profile's name or its signed-in email, ignoring case.
 */
export function matchProfile(infoCache: Record<string, ChromeProfile>, query: string): string {
  const wanted = query.toLowerCase();
  const match = Object.entries(infoCache).find(([directory, profile]) =>
    [directory, profile.name, profile.user_name].some((value) => value?.toLowerCase() === wanted)
  );
  if (match) return match[0];
  const known = Object.entries(infoCache)
    .map(([directory, profile]) => `${directory} (${[profile.name, profile.user_name].filter(Boolean).join(", ")})`)
    .join("; ");
  throw new Error(`No Chrome profile matches "${query}". Profiles: ${known}.`);
}
