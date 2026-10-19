#!/usr/bin/env bun
import { parseArgs } from "node:util";
import {
  appleScriptBounds,
  canvasSize,
  centerIn,
  panes,
  pickDisplay,
  usableArea,
  type Layout,
  type Rect,
} from "../lib/canvas/layout.ts";
import { checkUrl, listDisplays, openChromeWindow, resolveProfile, startFrame, stopFrame } from "../lib/canvas/macos.ts";

const USAGE = `Usage:
  canvas open [--ratio 16:9] [--size 1920x1080] [--panes 2] [--layout columns|rows]
              [--gap 0] [--url <url>]... [--display <index>] [--profile <email|name>]
              [--browser-ui] [--no-frame]
  canvas frame [--ratio 16:9] [--size 1920x1080] [--display <index>]
  canvas off
  canvas displays`;

/** Where the canvas goes for these sizing flags: the same spot for `open` and `frame`. */
function placeCanvas(ratio: string, size: string | undefined, displayIndex: string | undefined) {
  const displays = listDisplays();
  const display = pickDisplay(displays, displayIndex === undefined ? undefined : Number(displayIndex));
  const area = usableArea(display);
  const [width, height] = canvasSize(ratio, size, area);
  return { display, canvas: centerIn(area, width, height), mainHeight: displays[0].frame.height };
}

function holdFrame(canvas: Rect) {
  console.log("Frame is up. Record the area inside it. Stop with Ctrl-C or `canvas off`.");
  const frame = startFrame(canvas);
  for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => frame.kill());
  frame.on("exit", (code) => process.exit(code ?? 0));
}

function open(argv: string[]) {
  const { values } = parseArgs({
    args: argv,
    options: {
      ratio: { type: "string", default: "16:9" },
      size: { type: "string" },
      panes: { type: "string", default: "2" },
      layout: { type: "string" },
      gap: { type: "string", default: "0" },
      url: { type: "string", multiple: true, default: [] },
      display: { type: "string" },
      profile: { type: "string" },
      "browser-ui": { type: "boolean", default: false },
      "no-frame": { type: "boolean", default: false },
    },
  });
  const count = Number(values.panes);
  const gap = Number(values.gap);
  if (!Number.isInteger(count) || count < 1) throw new Error("--panes must be a whole number of 1 or more.");
  if (!Number.isFinite(gap) || gap < 0) throw new Error("--gap must be 0 or more.");
  if (values.layout !== undefined && values.layout !== "columns" && values.layout !== "rows") {
    throw new Error("--layout must be columns or rows.");
  }
  values.url.forEach(checkUrl);
  const profileDirectory = values.profile === undefined ? undefined : resolveProfile(values.profile);

  const { display, canvas, mainHeight } = placeCanvas(values.ratio, values.size, values.display);
  const { width, height } = canvas;
  const layout: Layout = values.layout ?? (width >= height ? "columns" : "rows");
  const windows = panes(canvas, count, layout, gap).map((pane) => appleScriptBounds(pane, mainHeight));

  stopFrame();
  for (const [i, bounds] of windows.entries()) {
    openChromeWindow(bounds, { url: values.url[i], profileDirectory, app: !values["browser-ui"] });
  }

  const [left, top] = appleScriptBounds(canvas, mainHeight);
  console.log(
    `Canvas ${width}x${height} pt (${width * display.scale}x${height * display.scale} px) on display ` +
      `${display.index}, ${count} ${layout}, top-left at ${left},${top}.`
  );
  if (!values["no-frame"]) holdFrame(canvas);
}

function frame(argv: string[]) {
  const { values } = parseArgs({
    args: argv,
    options: {
      ratio: { type: "string", default: "16:9" },
      size: { type: "string" },
      display: { type: "string" },
    },
  });
  const { display, canvas, mainHeight } = placeCanvas(values.ratio, values.size, values.display);
  stopFrame();
  const [left, top] = appleScriptBounds(canvas, mainHeight);
  console.log(`Frame around ${canvas.width}x${canvas.height} pt on display ${display.index}, top-left at ${left},${top}.`);
  holdFrame(canvas);
}

const [command, ...rest] = process.argv.slice(2);
if (command === "open") open(rest);
else if (command === "frame") frame(rest);
else if (command === "off") stopFrame();
else if (command === "displays") {
  for (const d of listDisplays()) {
    console.log(`${d.index}: ${d.frame.width}x${d.frame.height} pt at ${d.frame.x},${d.frame.y}, scale ${d.scale}`);
  }
} else {
  console.error(USAGE);
  process.exit(1);
}
