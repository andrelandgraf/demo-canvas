# Contributing

```bash
bun install
bun run typecheck
bun run test
bun run canvas open
```

- `lib/canvas/layout.ts` is pure: sizing, panes and the Cocoa-to-AppleScript coordinate conversion. Unit tests next to it use real display numbers.
- `lib/canvas/macos.ts` is the shell: `osascript` for displays, Chrome windows and the frame.
- `lib/canvas/frame.js` runs under `osascript -l JavaScript` and lives as long as the frame.

Cocoa coordinates have their origin at the bottom left of the main display with y up. AppleScript window bounds have it at the top left with y down. `appleScriptBounds` converts between them.

Pass integers into AppleScript by writing them into the script, not as `osascript` arguments: `osascript` reads a negative argument such as `-2680` as a flag.

Changes that move windows can only be checked on a real screen: run `canvas open`, then compare Chrome's bounds (`osascript -e 'tell application "Google Chrome" to get bounds of every window'`) with the printed canvas.
