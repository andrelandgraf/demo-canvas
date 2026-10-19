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

  test("prefers the directory over another profile's name", () => {
    const collision = { Default: { name: "Profile 2" }, "Profile 2": { name: "Andre" } };
    expect(matchProfile(collision, "Profile 2")).toBe("Profile 2");
  });

  test("treats inherited object keys as names, not directories", () => {
    expect(matchProfile({ "Profile 1": { name: "constructor" } }, "constructor")).toBe("Profile 1");
    expect(() => matchProfile(infoCache, "toString")).toThrow('No Chrome profile matches "toString"');
  });

  test("refuses a name that matches more than one profile", () => {
    const twins = { "Profile 1": { name: "Andre" }, "Profile 2": { name: "andre" } };
    expect(() => matchProfile(twins, "Andre")).toThrow(
      '"Andre" matches more than one Chrome profile: Profile 1 (Andre); Profile 2 (andre). Pass the directory.'
    );
  });

  test("lists the profiles when nothing matches", () => {
    expect(() => matchProfile(infoCache, "nobody")).toThrow(
      'No Chrome profile matches "nobody". Profiles: Default (Your Chrome); Profile 1 (Person 1, work@example.com); Profile 2 (Andre, me@example.com).'
    );
  });
});
