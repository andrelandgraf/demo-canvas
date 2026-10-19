import { describe, expect, test } from "vitest";
import { matchProfile } from "./profiles.ts";

const infoCache = {
  Default: { name: "Your Chrome", user_name: "" },
  "Profile 1": { name: "Person 1", user_name: "work@example.com" },
  "Profile 2": { name: "Andre", user_name: "me@example.com" },
};

describe("matchProfile", () => {
  test("matches an email, a name or a directory, ignoring case", () => {
    expect(matchProfile(infoCache, "ME@example.com")).toBe("Profile 2");
    expect(matchProfile(infoCache, "person 1")).toBe("Profile 1");
    expect(matchProfile(infoCache, "Default")).toBe("Default");
  });

  test("lists the profiles when nothing matches", () => {
    expect(() => matchProfile(infoCache, "nobody")).toThrow(
      'No Chrome profile matches "nobody". Profiles: Default (Your Chrome); Profile 1 (Person 1, work@example.com); Profile 2 (Andre, me@example.com).'
    );
  });
});
