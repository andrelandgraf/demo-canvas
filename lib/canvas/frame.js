// Draws a border just outside the canvas, so the recording area can be lined
// up with it while the border itself stays out of the recording. Clicks pass
// through. Run: osascript -l JavaScript frame.js <x> <y> <width> <height> <thickness>
// with Cocoa coordinates (origin at the bottom left of the main display).
ObjC.import("AppKit");

function edge(x, y, width, height) {
  const win = $.NSWindow.alloc.initWithContentRectStyleMaskBackingDefer(
    $.NSMakeRect(x, y, width, height),
    $.NSWindowStyleMaskBorderless,
    $.NSBackingStoreBuffered,
    false
  );
  win.backgroundColor = $.NSColor.systemPinkColor;
  win.hasShadow = false;
  win.ignoresMouseEvents = true;
  win.level = $.NSStatusWindowLevel;
  win.collectionBehavior = $.NSWindowCollectionBehaviorCanJoinAllSpaces | $.NSWindowCollectionBehaviorStationary;
  win.orderFrontRegardless;
  return win;
}

function run(argv) {
  const [x, y, width, height, t] = argv.map(Number);
  const app = $.NSApplication.sharedApplication;
  app.setActivationPolicy($.NSApplicationActivationPolicyAccessory);
  // Kept in an array so the windows aren't released while the app runs.
  const edges = [
    edge(x - t, y + height, width + 2 * t, t),
    edge(x - t, y - t, width + 2 * t, t),
    edge(x - t, y, t, height),
    edge(x + width, y, t, height),
  ];
  app.run;
  return edges.length;
}
