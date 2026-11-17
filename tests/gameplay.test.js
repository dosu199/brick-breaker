const assert = require('node:assert/strict');
const test = require('node:test');
const { loadScripts, createDrawingContext } = require('./helpers');

const WORLD = { width: 700, height: 400 };
const WALL = Array(5).fill('############');
const countBricks = rows => rows.join('').split('#').length - 1;

const FILES = ['config.js', 'assets.js', 'render.js', 'starfield.js', 'input.js', 'paddle.js', 'ball.js', 'bricks.js', 'collision.js', 'powerup.js', 'game.js'];

function load(globals = {}) {
  return loadScripts(FILES, ['CONFIG', 'Assets', 'Ball', 'Bricks', 'Collision', 'Game', 'Paddle', 'PowerUp', 'Starfield'], { Math, window: { addEventListener() {} }, ...globals });
}

function createGame(exports) {
  const canvas = {
    getContext: () => createDrawingContext(),
    clientWidth: WORLD.width,
    clientHeight: WORLD.height,
    addEventListener() {},
  };
  return new exports.Game(canvas, { state: null, update(state) { this.state = state; } });
}

function clickAndStep(game, now = 0) {
  game.input.launchRequested = true;
  game.update(now);
}

test('circleRect reports overlap and the offset from the closest point', () => {
  const { Collision } = load();
  const rect = { x: 0, y: 0, width: 10, height: 10 };

  assert.deepEqual({ ...Collision.circleRect({ x: 12, y: 5, radius: 3 }, rect) }, { distX: 2, distY: 0 });
  assert.equal(Collision.circleRect({ x: 20, y: 5, radius: 3 }, rect), null);
});

test('a normal ball bounces off the first brick it hits', () => {
  const { Ball, Bricks, Collision } = load();
  const bricks = new Bricks({ ...WORLD }, WALL);
  const target = bricks.grid[0][0];
  const ball = new Ball({ ...WORLD });
  Object.assign(ball, { x: target.x + target.width / 2, y: target.y + target.height + 5, dx: 1, dy: -5 });

  const hits = Collision.ballBricks(ball, bricks.grid);

  assert.equal(hits.length, 1);
  assert.equal(hits[0], target);
  assert.equal(target.alive, false);
  assert.equal(ball.dy, 5);
});

test('a fireball destroys every brick it touches without bouncing', () => {
  const { Ball, Bricks, Collision } = load();
  const bricks = new Bricks({ ...WORLD }, WALL);
  const [left, right] = bricks.grid[0];
  const ball = new Ball({ ...WORLD });
  ball.fireball = true;
  Object.assign(ball, { x: left.x + left.width + bricks.padding / 2, y: left.y + 5, dx: 1, dy: -5 });

  const hits = Collision.ballBricks(ball, bricks.grid);

  assert.equal(hits.length, 2);
  assert.ok(hits[0] === left && hits[1] === right);
  assert.equal(ball.dy, -5);
});

test('the paddle bounce angle depends on where the ball lands', () => {
  const { CONFIG, Ball, Collision } = load();
  const paddle = { x: 100, y: 300, width: 100, height: 12 };
  const ball = new Ball({ ...WORLD });
  Object.assign(ball, { x: 200, y: 295, dx: 0, dy: 5 });

  assert.equal(Collision.ballPaddle(ball, paddle), true);
  assert.ok(ball.dx > 0 && ball.dy < 0);
  assert.ok(Math.abs(Math.atan2(ball.dx, -ball.dy) - CONFIG.ball.maxBounceAngle) < 1e-9);
  assert.equal(ball.y, paddle.y - ball.radius);
});

test('the ball is pushed back inside when it crosses a wall', () => {
  const { CONFIG, Ball } = load();
  const ball = new Ball({ ...WORLD });
  Object.assign(ball, { x: WORLD.width - 1, y: 100, dx: 5, dy: 0 });

  ball.update();

  assert.equal(ball.x, WORLD.width - ball.radius);
  assert.equal(ball.dx, -5);
});

test('timed power-ups expire on their own and never stack', () => {
  const exports = load();
  const { CONFIG } = exports;
  const game = createGame(exports);
  clickAndStep(game);

  game.collectPowerUp('expand', 0);
  game.collectPowerUp('expand', 100);
  game.collectPowerUp('slow', 0);
  game.applyEffects(1000);
  assert.equal(game.paddle.width, CONFIG.paddle.width * CONFIG.effects.expandScale);
  assert.equal(game.ball.speedScale, CONFIG.effects.slowScale);

  game.applyEffects(100 + CONFIG.effects.durationMs);
  assert.equal(game.paddle.width, CONFIG.paddle.width);
  assert.equal(game.ball.speedScale, 1);
});

test('losing a life clears active effects and falling power-ups', () => {
  const exports = load();
  const game = createGame(exports);
  clickAndStep(game);
  game.collectPowerUp('fast', 0);
  game.powerUps.push(new exports.PowerUp(0, 0, game.world));

  game.ball.y = WORLD.height + 100;
  game.update(10);

  assert.equal(game.lives, exports.CONFIG.lives - 1);
  assert.equal(game.state, 'ready');
  assert.equal(game.powerUps.length, 0);
  game.applyEffects(20);
  assert.equal(game.ball.speedScale, 1);
});

test('clicking after game over starts a fresh game', () => {
  const exports = load();
  const game = createGame(exports);
  game.score = 120;
  game.lives = 0;
  game.state = 'lost';

  clickAndStep(game);

  assert.equal(game.state, 'ready');
  assert.equal(game.score, 0);
  assert.equal(game.lives, exports.CONFIG.lives);
  assert.equal(game.level, 0);
  assert.equal(game.bricks.remaining(), countBricks(exports.CONFIG.levels.maps[0].rows));
});

test('the world matches the canvas size 1:1 and is backed by device pixels', () => {
  const exports = load({ devicePixelRatio: 2 });
  const game = createGame(exports);
  const { CONFIG } = exports;
  const cols = game.bricks.cols;

  assert.deepEqual({ ...game.world }, WORLD);
  assert.equal(game.paddle.width, CONFIG.paddle.width, 'objects are not zoomed');

  Object.assign(game.canvas, { clientWidth: 1800, clientHeight: 900 });
  game.resize();

  assert.deepEqual({ ...game.world }, { width: 1800, height: 900 });
  assert.equal(game.canvas.width, 3600);
  assert.equal(game.canvas.height, 1800);
  assert.equal(game.scale, 2);
  assert.equal(game.paddle.y, 900 - CONFIG.paddle.height - CONFIG.paddle.bottomMargin, 'paddle stays at the bottom');

  const firstBrick = game.bricks.grid[0][0];
  const lastBrick = game.bricks.grid[0][cols - 1];
  assert.equal(game.bricks.cols, cols, 'resizing mid-game keeps the same bricks');
  assert.equal(lastBrick.width, CONFIG.bricks.maxWidth, 'bricks are capped on a big screen');
  assert.ok(Math.abs(firstBrick.x - (1800 - (lastBrick.x + lastBrick.width))) < 1e-9, 'and centered');
});

function fakeLoadedImage(Assets, path, naturalWidth, naturalHeight) {
  const image = { complete: true, naturalWidth, naturalHeight };
  Assets.images[path] = image;
  return image;
}

test('the paddle draws a stretched 3-slice sprite once its image is loaded', () => {
  const { CONFIG, Assets, Paddle } = load();
  const paddle = new Paddle({ ...WORLD });
  const ctx = createDrawingContext();

  paddle.draw(ctx);
  assert.equal(ctx.images.length, 0, 'falls back to a shape before the image loads');
  assert.equal(ctx.rectangles.length, 1);

  const image = fakeLoadedImage(Assets, CONFIG.paddle.image, 200, 24);
  paddle.setScale(1.5);
  paddle.draw(ctx);

  const [left, middle, right] = ctx.images.map(call => call.args);
  assert.equal(ctx.images.length, 3);
  assert.ok(ctx.images.every(call => call.image === image));
  assert.deepEqual([...left], [0, 0, 24, 24, paddle.x, paddle.y, paddle.height, paddle.height]);
  assert.deepEqual([...middle.slice(0, 4)], [24, 0, 152, 24]);
  assert.equal(middle[6], paddle.width - 2 * paddle.height);
  assert.equal(right[4] + right[6], paddle.x + paddle.width, 'right cap ends at the paddle edge');
});

test('power-ups draw their own icon, sized to their hitbox', () => {
  const { Assets, PowerUp } = load();
  const powerUp = new PowerUp(50, 60, { ...WORLD });
  const image = fakeLoadedImage(Assets, powerUp.image, 44, 44);
  const ctx = createDrawingContext();

  powerUp.draw(ctx);

  assert.equal(ctx.images.length, 1);
  assert.equal(ctx.images[0].image, image);
  const r = powerUp.radius;
  assert.deepEqual([...ctx.images[0].args], [50 - r, 60 - r, 2 * r, 2 * r]);
});

test('every configured sprite exists on disk', () => {
  const { CONFIG } = load();
  const { existsSync } = require('node:fs');
  const path = require('node:path');
  const images = [CONFIG.paddle.image, CONFIG.ball.image, CONFIG.ball.fireballImage, CONFIG.bricks.image, ...CONFIG.powerUps.types.map(t => t.image)];

  for (const image of images) {
    assert.ok(existsSync(path.join(__dirname, '..', image)), `${image} is missing`);
  }
});

test('the fireball sprite is larger and rotated to trail behind the ball', () => {
  const { CONFIG, Assets, Ball } = load();
  const normal = fakeLoadedImage(Assets, CONFIG.ball.image, 48, 48);
  const fire = fakeLoadedImage(Assets, CONFIG.ball.fireballImage, 96, 96);
  const ball = new Ball({ ...WORLD });
  Object.assign(ball, { x: 100, y: 50, dx: 0, dy: 5 });
  const r = ball.radius;

  const ctx = createDrawingContext();
  ball.draw(ctx);
  assert.equal(ctx.images[0].image, normal);
  assert.deepEqual([...ctx.images[0].args], [-r, -r, 2 * r, 2 * r]);
  assert.deepEqual(ctx.transforms.map(t => [...t]), [['translate', 100, 50]], 'normal ball is not rotated');

  const fireCtx = createDrawingContext();
  ball.fireball = true;
  ball.draw(fireCtx);
  const size = 2 * r * CONFIG.ball.fireballSpriteScale;
  assert.equal(fireCtx.images[0].image, fire);
  assert.deepEqual([...fireCtx.images[0].args], [-size / 2, -size / 2, size, size]);
  assert.deepEqual(fireCtx.transforms.map(t => [...t]), [['translate', 100, 50], ['rotate', Math.PI / 2]]);
});

test('the starfield keeps its density on resize and recycles stars at the top', () => {
  const { CONFIG, Starfield } = load();
  const world = { ...WORLD };
  const starfield = new Starfield(world);

  assert.equal(starfield.stars.length, Math.round(WORLD.width * WORLD.height * CONFIG.stars.density));

  world.width *= 2;
  starfield.resize();
  assert.equal(starfield.stars.length, Math.round(world.width * world.height * CONFIG.stars.density));

  const star = starfield.stars[0];
  star.y = world.height + 1;
  starfield.update();
  assert.equal(star.y, 0, 'a star that drifts off the bottom re-enters at the top');
  assert.ok(starfield.stars.every(s => s.y >= 0 && s.y <= world.height));
});

test('sprites are painted once per look and then copied from the cache', () => {
  class FakeOffscreenCanvas {
    constructor(width, height) {
      Object.assign(this, { width, height });
    }
    getContext() {
      return createDrawingContext();
    }
  }
  const { CONFIG, Bricks } = load({ OffscreenCanvas: FakeOffscreenCanvas });
  const bricks = new Bricks({ ...WORLD }, WALL);
  let paints = 0;
  for (const brick of bricks.grid.flat()) {
    const paint = brick.paint.bind(brick);
    brick.paint = (...args) => { paints++; paint(...args); };
  }
  const ctx = createDrawingContext();

  bricks.draw(ctx);
  bricks.draw(ctx);

  assert.equal(paints, CONFIG.bricks.colors.length, 'one paint per brick color, not per brick or frame');
  const brickCount = bricks.rows * bricks.cols;
  assert.equal(ctx.images.length, 2 * brickCount, 'every brick is copied from its cached sprite each frame');
  assert.ok(ctx.images.every(call => call.image instanceof FakeOffscreenCanvas));
});

function clearBoard(game) {
  for (const brick of game.bricks.grid.flat()) {
    if (brick) brick.alive = false;
  }
}

test('every level map is a rectangle with at least one brick', () => {
  const { CONFIG } = load();
  assert.equal(CONFIG.levels.maps.length, 5);
  for (const { name, rows } of CONFIG.levels.maps) {
    assert.ok(rows.length > 0, name);
    assert.ok(rows.every(row => row.length === rows[0].length && /^[#.]+$/.test(row)), `${name} rows must be equal length and only # or .`);
    assert.ok(countBricks(rows) > 0, name);
  }
});

test('clearing a level moves to the next one, keeping score and lives, with a faster ball', () => {
  const exports = load();
  const { CONFIG } = exports;
  const game = createGame(exports);
  clickAndStep(game);
  game.score = 120;
  game.lives = 2;

  clearBoard(game);
  game.update(0);
  assert.equal(game.state, 'levelComplete');

  clickAndStep(game);
  assert.equal(game.level, 1);
  assert.equal(game.state, 'ready');
  assert.equal(game.score, 120);
  assert.equal(game.lives, 2, 'lives carry over');
  assert.equal(game.bricks.remaining(), countBricks(CONFIG.levels.maps[1].rows));
  assert.equal(game.ball.speed, CONFIG.ball.speed * (1 + CONFIG.levels.speedIncrease));
  assert.deepEqual({ ...game.hud.state }, { score: 120, level: 1, levelCount: CONFIG.levels.maps.length, levelName: CONFIG.levels.maps[1].name, lives: 2 });

  game.update(0);
  assert.equal(game.ball.dx, game.ball.speed, 'the ball launches at the level speed');
});

test('clearing the last level wins, and a new game starts back at level 1', () => {
  const exports = load();
  const { CONFIG } = exports;
  const game = createGame(exports);
  game.startLevel(CONFIG.levels.maps.length - 1);
  clickAndStep(game);

  clearBoard(game);
  game.update(0);
  assert.equal(game.state, 'won');

  clickAndStep(game);
  assert.equal(game.level, 0);
  assert.equal(game.lives, CONFIG.lives);
  assert.equal(game.ball.speed, CONFIG.ball.speed);
});
