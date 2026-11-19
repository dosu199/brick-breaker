Assets.load([
  CONFIG.paddle.image,
  CONFIG.ball.image,
  CONFIG.ball.fireballImage,
  CONFIG.bricks.image,
  CONFIG.bricks.armorImage,
  ...CONFIG.bricks.crackImages,
  ...CONFIG.powerUps.types.map(t => t.image),
]);

const game = new Game(document.getElementById('game'), new Hud(document));

// The play field gets the window minus the gutters and a minimum width for
// each side panel; the panels then take whatever is left beside it.
function fit() {
  const styles = getComputedStyle(document.documentElement);
  const gutter = parseFloat(styles.getPropertyValue('--gutter'));
  const panelMin = parseFloat(styles.getPropertyValue('--panel-min'));
  game.resize(window.innerWidth - 4 * gutter - 2 * panelMin, window.innerHeight - 2 * gutter);
}
window.addEventListener('resize', fit);
fit();

window.addEventListener('keydown', (e) => {
  if (e.key !== 'f' && e.key !== 'F') return;
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen().catch(() => {});
  }
});

game.start();
