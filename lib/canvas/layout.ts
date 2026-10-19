/** Cocoa coordinates: origin at the bottom left of the main display, y up. */
export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Display {
  index: number;
  frame: Rect;
  visible: Rect;
  scale: number;
}

export type Layout = "columns" | "rows";

export const FRAME_THICKNESS = 3;
const MARGIN = 24;
// macOS keeps window title bars below a display's menu bar even when the
// display's visible frame doesn't exclude it; 30 pt measured on a 3440x1440
// external display.
const MENU_BAR = 30;

/** Pixel sizes social platforms expect, in points; scaled down when they don't fit. */
export const PRESETS: Record<string, [number, number]> = {
  "16:9": [1920, 1080],
  "9:16": [1080, 1920],
  "1:1": [1080, 1080],
  "4:5": [1080, 1350],
};

export function parseSize(value: string, flag: string): [number, number] {
  const match = /^(\d+)[x:](\d+)$/.exec(value);
  if (!match) throw new Error(`${flag} must look like 1920x1080 or 16:9, got "${value}".`);
  const [width, height] = [Number(match[1]), Number(match[2])];
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width === 0 || height === 0) {
    throw new Error(`${flag} needs two whole numbers above zero, got "${value}".`);
  }
  return [width, height];
}

/** The display with the most area, or the one at `index`. */
export function pickDisplay(displays: Display[], index?: number): Display {
  if (index !== undefined) {
    const display = displays[index];
    if (!display) throw new Error(`No display ${index}. Run "displays" to list them.`);
    return display;
  }
  return displays.reduce((a, b) => (b.frame.width * b.frame.height > a.frame.width * a.frame.height ? b : a));
}

/** Where windows can go: the visible frame, minus a menu bar it didn't already exclude. */
export function usableArea(display: Display): Rect {
  const { frame, visible } = display;
  const menuBarCounted = visible.y + visible.height < frame.y + frame.height;
  return menuBarCounted ? visible : { ...visible, height: visible.height - MENU_BAR };
}

/** The canvas size: the preset or `size`, scaled down to fit `area` with room for the frame. */
export function canvasSize(ratio: string, size: string | undefined, area: Rect): [number, number] {
  const [rw, rh] = parseSize(ratio, "--ratio");
  const [width, height] = size
    ? parseSize(size, "--size")
    : (PRESETS[ratio] ?? (rw >= rh ? [1920, Math.round((1920 * rh) / rw)] : [Math.round((1920 * rw) / rh), 1920]));
  const room = MARGIN + FRAME_THICKNESS;
  const scale = Math.min(1, (area.width - 2 * room) / width, (area.height - 2 * room) / height);
  const fitted: [number, number] = [Math.floor(width * scale), Math.floor(height * scale)];
  if (fitted[0] < 1 || fitted[1] < 1) {
    throw new Error(`A ${width}x${height} canvas doesn't fit this display: pick a less extreme --ratio or --size.`);
  }
  return fitted;
}

/** A canvas of `width` by `height`, centered in `area`. */
export function centerIn(area: Rect, width: number, height: number): Rect {
  return {
    x: Math.round(area.x + (area.width - width) / 2),
    y: Math.round(area.y + (area.height - height) / 2),
    width,
    height,
  };
}

/** Splits the canvas into `count` panes, first pane left (columns) or top (rows). */
export function panes(canvas: Rect, count: number, layout: Layout, gap: number): Rect[] {
  const along = layout === "columns" ? canvas.width : canvas.height;
  const each = (along - gap * (count - 1)) / count;
  if (each < 1) throw new Error(`${count} panes with a ${gap} pt gap don't fit a ${along} pt canvas.`);
  return Array.from({ length: count }, (_, i) => {
    const start = Math.round(i * (each + gap));
    const end = Math.round(i * (each + gap) + each);
    return layout === "columns"
      ? { x: canvas.x + start, y: canvas.y, width: end - start, height: canvas.height }
      : { x: canvas.x, y: canvas.y + canvas.height - end, width: canvas.width, height: end - start };
  });
}

/** AppleScript window bounds: {left, top, right, bottom} with the origin at the main display's top left, y down. */
export function appleScriptBounds(rect: Rect, mainHeight: number): [number, number, number, number] {
  const top = mainHeight - (rect.y + rect.height);
  return [rect.x, top, rect.x + rect.width, top + rect.height];
}
