/** One entry of `profile.info_cache` in Chrome's `Local State`, keyed by profile directory. */
export interface ChromeProfile {
  name?: string;
  user_name?: string;
}

function describe(infoCache: Record<string, ChromeProfile>, directories: string[]): string {
  return directories
    .map((directory) => {
      const { name, user_name } = infoCache[directory];
      return `${directory} (${[name, user_name].filter(Boolean).join(", ")})`;
    })
    .join("; ");
}

/**
 * The profile directory (like "Profile 2") for `query`: the directory itself,
 * or the one profile whose name or signed-in email matches, ignoring case.
 */
export function matchProfile(infoCache: Record<string, ChromeProfile>, query: string): string {
  if (Object.hasOwn(infoCache, query)) return query;
  const wanted = query.toLowerCase();
  const matches = Object.keys(infoCache).filter((directory) => {
    const { name, user_name } = infoCache[directory];
    return [name, user_name].some((value) => value?.toLowerCase() === wanted);
  });
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) {
    throw new Error(`"${query}" matches more than one Chrome profile: ${describe(infoCache, matches)}. Pass the directory.`);
  }
  throw new Error(`No Chrome profile matches "${query}". Profiles: ${describe(infoCache, Object.keys(infoCache))}.`);
}
