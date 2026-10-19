import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { FRAME_THICKNESS, type Display, type Rect } from "./layout.ts";
import { matchProfile, type ChromeProfile } from "./profiles.ts";

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

/** The profile directory for an email, profile name or directory, from Chrome's `Local State`. */
export function resolveProfile(query: string): string {
  const path = join(homedir(), "Library/Application Support/Google/Chrome/Local State");
  const state: { profile?: { info_cache?: Record<string, ChromeProfile> } } = JSON.parse(readFileSync(path, "utf8"));
  return matchProfile(state.profile?.info_cache ?? {}, query);
}

export interface WindowOptions {
  url: string | undefined;
  /** A profile directory; without one, Chrome uses the profile it used last. */
  profileDirectory: string | undefined;
  /** An app window: no tabs, address bar or bookmarks bar. */
  app: boolean;
}

function windowIds(): string[] {
  const out = execFileSync("osascript", ["-e", 'tell application "Google Chrome" to get id of every window'], {
    encoding: "utf8",
  }).trim();
  return out === "" ? [] : out.split(", ");
}

/** Waits for the window Chrome opens after `open`, the one id that wasn't there before. */
function newWindowId(before: string[]): string {
  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    const added = windowIds().filter((id) => !before.includes(id));
    if (added.length === 1) return added[0];
    if (added.length > 1) throw new Error("Chrome opened more than one window at once; close the extra one and retry.");
    execFileSync("sleep", ["0.2"]);
  }
  throw new Error("Chrome didn't open a window within 10 seconds.");
}

/**
 * Opens a new Chrome window at `bounds` and fails when Chrome keeps it
 * elsewhere, which happens below Chrome's minimum window size or under a
 * menu bar.
 */
export function openChromeWindow(bounds: [number, number, number, number], options: WindowOptions) {
  const url = options.url ?? "chrome://newtab/";
  checkUrl(url);
  const args = [
    ...(options.profileDirectory ? [`--profile-directory=${options.profileDirectory}`] : []),
    ...(options.app ? [`--app=${url}`] : ["--new-window", url]),
  ];
  const before = windowIds();
  // -n hands the arguments to the running Chrome, which opens the window and
  // lets the new process exit.
  execFileSync("open", ["-na", "Google Chrome", "--args", ...args]);
  const id = newWindowId(before);
  // The bounds are integers written into the script: osascript reads a
  // negative argument such as -2680 as one of its own flags.
  const script = `tell application "Google Chrome"
      set w to window id ${Number(id)}
      set bounds of w to {${bounds.map((n) => String(Math.round(n))).join(", ")}}
      delay 0.3
      set b to bounds of w
      return ((item 1 of b) as text) & "," & (item 2 of b) & "," & (item 3 of b) & "," & (item 4 of b)
    end tell`;
  const kept = execFileSync("osascript", ["-e", script], { encoding: "utf8" }).trim().split(",").map(Number);
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
