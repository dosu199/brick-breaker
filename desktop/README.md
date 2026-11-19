# Brick Breaker desktop (Tauri)

A desktop wrapper around the game in the parent folder. Nothing here changes
the game files; they are copied into `dist/` on every run.

## One-time setup
Tauri needs Rust and the Microsoft C++ Build Tools (WebView2 ships with
Windows 11):

```
winget install Microsoft.VisualStudio.2022.BuildTools --override "--add Microsoft.VisualStudio.Workload.VCTools --includeRecommended --passive"
winget install Rustlang.Rustup
```

Open a new terminal afterwards so `cargo` is on the PATH, then in this folder:

```
npm install
```

## Run and build
- `npm run tauri dev` opens the game in a desktop window. The first run
  compiles the Rust dependencies (5-10 minutes); later runs take seconds. The
  game is copied when it starts, so restart it to pick up game changes.
- `npm run tauri build` makes the Windows installers in
  `src-tauri/target/release/bundle/` (`nsis/*.exe` and `msi/*.msi`). They are
  unsigned, so Windows SmartScreen warns about an unknown publisher on first
  run.

## What's here
- `scripts/copy-web.mjs` copies `index.html`, `css/`, `js/` and `img/` from the
  game into `dist/` and adds `desktop.js` to the copied `index.html`.
- `web/desktop.js` holds the desktop-only tweaks: **F** toggles real window
  fullscreen (**Esc** leaves it), no right-click menu, and clicking the field
  locks the mouse to the window so it can't slip out mid-flick (**Esc**
  releases it).
- `src-tauri/` is the Rust shell and the window settings
  (`tauri.conf.json`: 1280x800, at least 900x600). Dev tools are only in
  debug builds.
- `app-icon.svg` is the source of the app icons; regenerate them with
  `npx tauri icon app-icon.svg -o src-tauri/icons`.
