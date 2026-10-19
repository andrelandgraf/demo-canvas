import { describe, expect, test } from "vitest";
import { appleScriptBounds, canvasSize, centerIn, panes, usableArea, type Display } from "./layout.ts";

// The 3440x1440 display left of the 1728x1117 laptop screen, as macOS reports it.
const ultrawide: Display = {
  index: 2,
  scale: 1,
  frame: { x: -3440, y: 281, width: 3440, height: 1440 },
  visible: { x: -3440, y: 371, width: 3440, height: 1350 },
};
const MAIN_HEIGHT = 1117;

describe("usableArea", () => {
  test("removes a menu bar the visible frame doesn't exclude", () => {
    expect(usableArea(ultrawide)).toEqual({ x: -3440, y: 371, width: 3440, height: 1320 });
  });

  test("keeps a visible frame that already excludes the menu bar", () => {
    const laptop: Display = {
      index: 0,
      scale: 2,
      frame: { x: 0, y: 0, width: 1728, height: 1117 },
      visible: { x: 0, y: 0, width: 1728, height: 1084 },
    };
    expect(usableArea(laptop)).toEqual(laptop.visible);
  });
});

describe("canvasSize", () => {
  const area = usableArea(ultrawide);

  test("uses the preset when it fits", () => {
    expect(canvasSize("16:9", undefined, area)).toEqual([1920, 1080]);
  });

  test("scales a preset down to fit", () => {
    expect(canvasSize("9:16", undefined, area)).toEqual([712, 1266]);
  });

  test("takes any ratio and an explicit size", () => {
    expect(canvasSize("21:9", undefined, area)).toEqual([1920, 823]);
    expect(canvasSize("16:9", "1600x900", area)).toEqual([1600, 900]);
  });

  test("rejects a malformed ratio", () => {
    expect(() => canvasSize("wide", undefined, area)).toThrow("--ratio must look like");
  });
});

describe("panes and bounds", () => {
  const canvas = centerIn(usableArea(ultrawide), 1920, 1080);

  test("two columns fill the canvas, in AppleScript bounds", () => {
    const [left, right] = panes(canvas, 2, "columns", 0).map((pane) => appleScriptBounds(pane, MAIN_HEIGHT));
    expect(left).toEqual([-2680, -454, -1720, 626]);
    expect(right).toEqual([-1720, -454, -760, 626]);
  });

  test("rows start at the top and leave the gap between them", () => {
    const [top, bottom] = panes(canvas, 2, "rows", 10).map((pane) => appleScriptBounds(pane, MAIN_HEIGHT));
    expect(top).toEqual([-2680, -454, -760, 81]);
    expect(bottom).toEqual([-2680, 91, -760, 626]);
  });
});
