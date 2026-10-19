import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath } from "node:url";
import { FRAME_THICKNESS, type Display, type Rect } from "./layout.ts";

const FRAME_SCRIPT = fileURLToPath(new URL("./frame.js", import.meta.url));

export function listDisplays(): Display[] {
  const source = `ObjC.import("AppKit");
    const s = $.NSScreen.screens; const out = [];
    for (let i = 0; i < s.count; i++) {
      const sc = s.objectAtIndex(i); const f = sc.frame; const v = sc.visibleFrame;
      out.push({ index: i, scale: sc.backingScaleFactor,
        frame: { x: f.origin.x, y: f.origin.y, width: f.size.width, height: f.size.height },
        visible: { x: v.origin.x, y: v.origin.y, width: v.size.width, height: v.size.height } });
    }
    JSON.stringify(out)`;
  return JSON.parse(execFileSync("osascript", ["-l", "JavaScript", "-e", source], { encoding: "utf8" }));
}

/** `osascript` would read a URL starting with "-" as one of its own flags. */
export function checkUrl(url: string) {
  if (url.startsWith("-")) throw new Error(`--url can't start with "-": ${url}`);
}

/**
 * Opens a new Chrome window at `bounds` and fails when Chrome keeps it
 * elsewhere, which happens below Chrome's minimum window size or under a
 * menu bar.
 */
export function openChromeWindow(bounds: [number, number, number, number], url: string | undefined) {
  if (url) checkUrl(url);
  // The bounds are integers written into the script: osascript reads a
  // negative argument such as -2680 as one of its own flags.
  const script = `on run argv
    tell application "Google Chrome"
      set w to make new window
      if (count of argv) > 0 then set URL of active tab of w to (item 1 of argv)
      set bounds of w to {${bounds.map((n) => String(Math.round(n))).join(", ")}}
      delay 0.3
      set b to bounds of w
      return ((item 1 of b) as text) & "," & (item 2 of b) & "," & (item 3 of b) & "," & (item 4 of b)
    end tell
  end run`;
  const kept = execFileSync("osascript", ["-e", script, ...(url ? [url] : [])], { encoding: "utf8" })
    .trim()
    .split(",")
    .map(Number);
  if (kept.join() !== bounds.join()) {
    throw new Error(
      `Chrome kept a window at ${kept.join(",")} instead of ${bounds.join(",")}. ` +
        "A pane is probably below Chrome's minimum window size: use fewer panes, --layout rows or a bigger --size."
    );
  }
}

export function startFrame(canvas: Rect): ChildProcess {
  const args = [canvas.x, canvas.y, canvas.width, canvas.height, FRAME_THICKNESS].map(String);
  return spawn("osascript", ["-l", "JavaScript", FRAME_SCRIPT, ...args], { stdio: "inherit" });
}

export function stopFrame() {
  try {
    execFileSync("pkill", ["-f", FRAME_SCRIPT]);
  } catch (error) {
    // pkill exits 1 when no frame is running; anything else is a real failure.
    if (!(error instanceof Error && "status" in error && error.status === 1)) throw error;
  }
}
