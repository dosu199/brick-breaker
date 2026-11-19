// Desktop-only tweaks. scripts/copy-web.mjs adds this to the copied
// index.html after main.js, so `game` (declared in main.js) is available.
// Listeners run in the capture phase so they can stop the browser versions in
// main.js and input.js from also running.
(() => {
  const appWindow = window.__TAURI__?.window.getCurrentWindow();
  const canvas = document.getElementById('game');

  // a game has no browser right-click menu
  window.addEventListener('contextmenu', e => e.preventDefault());

  // F toggles real fullscreen on the window (browser fullscreen inside a
  // webview can stay window-sized); Esc leaves it
  window.addEventListener('keydown', async e => {
    const toggle = e.key === 'f' || e.key === 'F';
    if (!toggle && e.key !== 'Escape') return;
    if (toggle) e.stopImmediatePropagation();
    if (!appWindow || e.repeat) return;
    const fullscreen = await appWindow.isFullscreen();
    if (toggle || fullscreen) await appWindow.setFullscreen(toggle ? !fullscreen : false);
  }, true);

  // Pointer lock: clicking the field captures the mouse so it can't leave the
  // window mid-flick. While locked the cursor position is frozen, so the
  // paddle follows the raw mouse movement instead. Esc releases the mouse.
  canvas.addEventListener('mousedown', () => {
    if (document.pointerLockElement !== canvas) canvas.requestPointerLock?.();
  });

  window.addEventListener('mousemove', e => {
    if (document.pointerLockElement !== canvas) return;
    e.stopImmediatePropagation();
    const { input, world } = game;
    const moved = input.mouseX + e.movementX * (world.width / canvas.clientWidth);
    input.mouseX = Math.max(0, Math.min(world.width, moved));
  }, true);
})();
