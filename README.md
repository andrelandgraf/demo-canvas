# demo-canvas

On a wide screen you can't record the whole display for a social video. demo-canvas opens Chrome windows that exactly fill a social-media aspect ratio, 16:9 by default with two windows side by side, and draws a thin frame just outside that area. In Screen Studio, record the area inside the frame.

The windows are Chrome app windows by default: no tabs, address bar or bookmarks bar, just the page.

macOS only. Needs [Bun](https://bun.sh) and Google Chrome.

## Usage

```bash
git clone git@github.com:andrelandgraf/demo-canvas.git
cd demo-canvas
bun install

bun run canvas open
```

```text
Canvas 1920x1080 pt (1920x1080 px) on display 2, 2 columns, top-left at -2680,-454.
Frame is up. Record the area inside it. Stop with Ctrl-C or `canvas off`.
```

`open` keeps running while the frame is up. Ctrl-C or `bun run canvas off` removes the frame; the Chrome windows stay. `bun run canvas frame` draws it again around the same canvas without opening windows; pass it the same `--ratio`, `--size` and `--display` as `open`. Running `open` or `frame` again replaces the frame.

```bash
bun run canvas open --ratio 9:16 --url https://neon.com --url https://console.neon.tech
bun run canvas open --profile me@example.com --browser-ui
bun run canvas open --ratio 1:1 --panes 1
bun run canvas open --size 1600x900 --gap 8
bun run canvas frame --ratio 9:16
bun run canvas displays
bun run canvas off
```

| Flag | Default | |
| --- | --- | --- |
| `--ratio` | `16:9` | Presets `16:9` (1920×1080), `9:16` (1080×1920), `1:1` (1080×1080), `4:5` (1080×1350); any `W:H` works at 1920 on its long side |
| `--size` | the preset | Canvas size in points, like `1600x900` |
| `--panes` | `2` | Number of Chrome windows |
| `--layout` | `columns` for landscape, `rows` for portrait | |
| `--gap` | `0` | Points between panes |
| `--url` | New Tab | One per pane, in order. App windows load web pages; other `chrome://` pages show New Tab |
| `--display` | the largest | Index from `displays` |
| `--profile` | Chrome's last-used profile | Chrome profile by signed-in email, profile name or directory |
| `--browser-ui` | off | Normal Chrome windows with tabs and toolbar instead of app windows |
| `--no-frame` | off | Place the windows without the frame |

A canvas that doesn't fit the display's usable area scales down, keeping its ratio. On a 1x display points are pixels, so 16:9 records at 1920×1080. A 9:16 canvas on a 1440-tall display comes out at 712×1266.

## How it works

1. `NSScreen` (through JavaScript for Automation) lists the displays. The canvas goes on the largest one, centered in its usable area: the visible frame minus a 30 pt menu bar when the visible frame doesn't already exclude one. macOS keeps window title bars below a menu bar even when the visible frame says otherwise.
2. The canvas splits into panes. For each pane, `open -na "Google Chrome" --args --profile-directory=… --app=<url>` opens a window in the chosen profile; the tool finds it by its new AppleScript window id, sets its bounds and reads them back. If Chrome kept a window somewhere else, usually because a pane is below Chrome's minimum width, `open` stops with an error naming the bounds.
3. `lib/canvas/frame.js` draws four 3 pt windows around the canvas, at status-bar level, ignoring mouse events and on every Space. They sit outside the canvas, so a recording of the canvas area doesn't include them.

`lib/canvas/layout.ts` holds the pure layout math (sizing, panes, coordinate conversion) and its tests; `lib/canvas/macos.ts` talks to macOS.

## License

[Apache 2.0](LICENSE)
