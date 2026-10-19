# Agents

Read [CONTRIBUTING.md](CONTRIBUTING.md) for the layout of the code and the checks.

- Run `bun run typecheck` and `bun run test` before opening a PR.
- Check window placement by reading bounds back, with Chrome's AppleScript `bounds` or `CGWindowListCopyWindowInfo`. Don't take screenshots with `screencapture`: it makes macOS ask whether the agent's app may record the screen.
- `open` runs until the frame stops. Run it in the background; the frame disappears when its process ends.
- Close test windows by their exact bounds so the user's own Chrome windows stay open.
