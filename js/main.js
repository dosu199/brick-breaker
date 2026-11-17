Assets.load([
  CONFIG.paddle.image,
  CONFIG.ball.image,
  CONFIG.ball.fireballImage,
  CONFIG.bricks.image,
  CONFIG.bricks.armorImage,
  ...CONFIG.bricks.crackImages,
  ...CONFIG.powerUps.types.map(t => t.image),
]);

const game = new Game(document.getElementById('game'), new Hud(document.getElementById('hud')));

window.addEventListener('resize', () => game.resize());

window.addEventListener('keydown', (e) => {
  if (e.key !== 'f' && e.key !== 'F') return;
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.documentElement.requestFullscreen().catch(() => {});
  }
});

game.start();
