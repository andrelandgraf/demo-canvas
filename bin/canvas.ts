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
} from "../lib/canvas/layout.ts";
import { checkUrl, listDisplays, openChromeWindow, startFrame, stopFrame } from "../lib/canvas/macos.ts";

const USAGE = `Usage:
  canvas open [--ratio 16:9] [--size 1920x1080] [--panes 2] [--layout columns|rows]
              [--gap 0] [--url <url>]... [--display <index>] [--no-frame]
  canvas off
  canvas displays`;

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

  const displays = listDisplays();
  const display = pickDisplay(displays, values.display === undefined ? undefined : Number(values.display));
  const area = usableArea(display);
  const [width, height] = canvasSize(values.ratio, values.size, area);
  const layout: Layout = values.layout ?? (width >= height ? "columns" : "rows");
  const canvas = centerIn(area, width, height);
  const mainHeight = displays[0].frame.height;
  const windows = panes(canvas, count, layout, gap).map((pane) => appleScriptBounds(pane, mainHeight));

  stopFrame();
  for (const [i, bounds] of windows.entries()) openChromeWindow(bounds, values.url[i]);

  const [left, top] = appleScriptBounds(canvas, mainHeight);
  console.log(
    `Canvas ${width}x${height} pt (${width * display.scale}x${height * display.scale} px) on display ` +
      `${display.index}, ${count} ${layout}, top-left at ${left},${top}.`
  );
  if (values["no-frame"]) return;
  console.log("Frame is up. Record the area inside it. Stop with Ctrl-C or `canvas off`.");
  const frame = startFrame(canvas);
  for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => frame.kill());
  frame.on("exit", (code) => process.exit(code ?? 0));
}

const [command, ...rest] = process.argv.slice(2);
if (command === "open") open(rest);
else if (command === "off") stopFrame();
else if (command === "displays") {
  for (const d of listDisplays()) {
    console.log(`${d.index}: ${d.frame.width}x${d.frame.height} pt at ${d.frame.x},${d.frame.y}, scale ${d.scale}`);
  }
} else {
  console.error(USAGE);
  process.exit(1);
}
