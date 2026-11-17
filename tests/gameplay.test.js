const assert = require('node:assert/strict');
const test = require('node:test');
const { loadScripts, createDrawingContext } = require('./helpers');

const WORLD = { width: 700, height: 400 };
const WALL = Array(5).fill('############');
const countBricks = rows => rows.join('').replaceAll('.', '').length;

const FILES = ['config.js', 'assets.js', 'render.js', 'starfield.js', 'input.js', 'paddle.js', 'ball.js', 'bricks.js', 'collision.js', 'powerup.js', 'particles.js', 'game.js'];

function load(globals = {}) {
  return loadScripts(FILES, ['CONFIG', 'Assets', 'Ball', 'Bricks', 'Collision', 'Game', 'Paddle', 'Particles', 'PowerUp', 'Starfield'], { Math, window: { addEventListener() {} }, ...globals });
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
  assert.equal(hits[0].brick, target);
  assert.equal(hits[0].destroyed, true);
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
  assert.ok(hits[0].brick === left && hits[1].brick === right);
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

  game.ball.y = game.world.height + 100;
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

test('the game scales with the window around the reference view size', () => {
  const exports = load({ devicePixelRatio: 2 });
  const game = createGame(exports);
  const { CONFIG } = exports;
  const { view } = CONFIG;
  const resizeTo = (clientWidth, clientHeight) => {
    Object.assign(game.canvas, { clientWidth, clientHeight });
    game.resize();
  };

  resizeTo(view.width, view.height);
  assert.equal(game.viewScale, 1, 'the reference size is drawn 1:1');
  assert.deepEqual({ ...game.world }, { width: view.width, height: view.height });

  resizeTo(view.width * 1.5, view.height * 1.5);
  assert.equal(game.viewScale, 1.5, 'a bigger window scales everything up');
  assert.deepEqual({ ...game.world }, { width: view.width, height: view.height }, 'the game sees the same world');
  assert.equal(game.canvas.width, view.width * 1.5 * 2, 'backed by device pixels');
  assert.equal(game.scale, 1.5 * 2);

  resizeTo(view.width * 2, view.height * 1.2);
  assert.equal(game.viewScale, 1.2, 'the tighter dimension decides, so nothing is cut off');
  assert.equal(game.world.height, view.height);
  assert.ok(game.world.width > view.width, 'a wider window shows a wider field');

  resizeTo(view.width * 5, view.height * 5);
  assert.equal(game.viewScale, view.maxScale, 'never zooms past the maximum');
  resizeTo(view.width * 0.3, view.height * 0.3);
  assert.equal(game.viewScale, view.minScale, 'never shrinks past the minimum');

  assert.equal(game.paddle.y, game.world.height - CONFIG.paddle.height - CONFIG.paddle.bottomMargin, 'paddle stays at the bottom');
  const first = game.bricks.grid.flat().find(Boolean);
  assert.ok(first.x >= 0, 'bricks stay inside the world after resizing');
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
    assert.ok(rows.every(row => row.length === rows[0].length && /^[#.1-9]+$/.test(row)), `${name} rows must be equal length and only #, . or a hit count`);
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

test('the mouse position is converted from screen pixels to game units', () => {
  const listeners = {};
  const { Input } = loadScripts(['input.js'], ['Input'], {
    window: { addEventListener: (type, handler) => { listeners[type] = handler; } },
  });
  const world = { width: 1200, height: 600 };
  const canvas = {
    clientWidth: 600,
    clientLeft: 1,
    getBoundingClientRect: () => ({ left: 100 }),
    addEventListener() {},
  };
  const input = new Input(canvas, world);

  listeners.mousemove({ clientX: 401 });

  assert.equal(input.mouseX, 600, 'the middle of a half-size canvas is the middle of the world');
});

test('breaking a brick bursts particles in its color, and a new level clears them', () => {
  const exports = load();
  const game = createGame(exports);
  const brick = game.bricks.grid[0][0];

  brick.hit();
  game.handleBrickHits([{ brick, damage: 1, destroyed: true }]);

  assert.equal(game.particles.rings.length, 1);
  assert.equal(game.particles.rings[0].color, brick.color);
  assert.ok(game.particles.sparks.some(s => s.color === brick.color));

  game.startLevel(1);
  assert.equal(game.particles.sparks.length, 0);
});

test('power-ups multiply the base ball speed', () => {
  const exports = load();
  const { CONFIG } = exports;
  const game = createGame(exports);
  clickAndStep(game);
  const base = Math.hypot(CONFIG.ball.speed, CONFIG.ball.speed);

  assert.equal(CONFIG.ball.speed, 7.5);
  assert.equal(game.ball.distancePerTick(), base);

  game.collectPowerUp('fast', 0);
  game.applyEffects(1);
  assert.equal(game.ball.distancePerTick(), base * CONFIG.effects.fastScale);

  game.effectsUntil = {};
  game.collectPowerUp('slow', 0);
  game.applyEffects(1);
  assert.equal(game.ball.distancePerTick(), base * CONFIG.effects.slowScale);
});

test('a very fast ball cannot skip through a brick in one frame', () => {
  const exports = load();
  const game = createGame(exports);
  clickAndStep(game);
  const brick = game.bricks.grid.at(-1).find(Boolean);
  Object.assign(game.ball, {
    x: brick.x + brick.width / 2,
    y: brick.y + brick.height + game.ball.radius + 2,
    dx: 0,
    dy: -(brick.height + 4 * game.ball.radius),
  });

  game.update(0);

  assert.equal(brick.alive, false, 'the brick in its path is hit');
  assert.ok(game.ball.dy > 0, 'and the ball bounces back');
  assert.ok(game.ball.y > brick.y, 'instead of ending up past it');
});

test('a very fast ball cannot skip through the paddle in one frame', () => {
  const exports = load();
  const game = createGame(exports);
  clickAndStep(game);
  const { paddle, ball } = game;
  Object.assign(ball, {
    x: paddle.x + paddle.width / 2,
    y: paddle.y - ball.radius - 2,
    dx: 0,
    dy: paddle.height + 4 * ball.radius,
  });

  game.update(0);

  assert.ok(ball.dy < 0, 'the ball bounces off the paddle');
  assert.ok(ball.y <= paddle.y, 'and stays above it');
  assert.equal(game.lives, exports.CONFIG.lives);
});

test('a 3 in a level map is an armored brick with three hit points', () => {
  const { CONFIG, Bricks } = load();
  const bricks = new Bricks({ ...WORLD }, ['#3']);
  const [normal, armored] = bricks.grid[0];

  assert.equal(normal.maxHits, 1);
  assert.equal(armored.maxHits, 3);
  assert.equal(armored.isArmored(), true);
  assert.equal(armored.color, CONFIG.bricks.armorColor);
});

test('an armored brick cracks on the first two hits and breaks on the third', () => {
  const exports = load();
  const { CONFIG } = exports;
  CONFIG.powerUps.dropChance = 1;
  const game = createGame(exports);
  const armored = new exports.Bricks({ ...WORLD }, ['3']).grid[0][0];
  const stages = [];

  for (let hit = 1; hit <= 3; hit++) {
    stages.push(armored.crackStage());
    const damage = armored.hit();
    game.handleBrickHits([{ brick: armored, damage, destroyed: !armored.alive }]);
    if (hit < 3) {
      assert.equal(armored.alive, true, `still standing after hit ${hit}`);
      assert.equal(game.powerUps.length, 0, 'no power-up until it breaks');
    }
  }

  assert.deepEqual(stages, [0, 1, 2], 'new, cracked, heavily cracked');
  assert.equal(armored.alive, false);
  assert.equal(game.score, 3 * CONFIG.bricks.points, 'every hit scores');
  assert.equal(game.powerUps.length, 1, 'a power-up can drop once it breaks');
  assert.equal(game.particles.rings.length, 1, 'only the final hit gets the full explosion');
});

test('a fireball breaks an armored brick in one hit', () => {
  const { Ball, Bricks, Collision } = load();
  const bricks = new Bricks({ ...WORLD }, ['3']);
  const armored = bricks.grid[0][0];
  const ball = new Ball({ ...WORLD });
  Object.assign(ball, { x: armored.x + armored.width / 2, y: armored.y + armored.height / 2, dx: 0, dy: -5, fireball: true });

  const [hit] = Collision.ballBricks(ball, bricks.grid);

  assert.deepEqual({ damage: hit.damage, destroyed: hit.destroyed }, { damage: 3, destroyed: true });
});

test('the barrier bounces a falling ball for ten seconds, then disappears', () => {
  const exports = load();
  const game = createGame(exports);
  clickAndStep(game);
  const drop = () => {
    Object.assign(game.ball, { x: 5, y: game.world.height - 30, dx: 0, dy: 20 });
  };

  game.collectPowerUp('barrier', 0);
  drop();
  game.update(9000);
  assert.ok(game.ball.dy < 0, 'the ball bounces off the barrier');
  assert.ok(game.ball.y + game.ball.radius <= game.barrierY());
  assert.equal(game.lives, exports.CONFIG.lives);

  drop();
  for (let i = 0; i < 5; i++) game.update(10001);
  assert.equal(game.lives, exports.CONFIG.lives - 1, 'after it expires the ball can fall again');
});

test('stronger power-ups are rarer', () => {
  const { CONFIG, PowerUp } = load();
  const { types, rarity } = CONFIG.powerUps;
  const tierOf = name => types.find(t => t.type === name).rarity;
  const total = types.reduce((sum, t) => sum + PowerUp.weight(t), 0);
  const odds = name => PowerUp.weight(types.find(t => t.type === name)) / total;

  assert.ok(rarity.common > rarity.uncommon && rarity.uncommon > rarity.rare && rarity.rare > rarity.epic);
  assert.equal(tierOf('extraLife'), 'epic');
  assert.deepEqual([tierOf('fireball'), tierOf('barrier')], ['rare', 'rare']);
  assert.deepEqual([tierOf('magnet'), tierOf('reverse')], ['uncommon', 'uncommon']);
  assert.ok(types.every(t => PowerUp.weight(t) > 0), 'every type has a known rarity');
  assert.ok(odds('extraLife') < 0.05, 'extra life under 5% of drops');

  assert.equal(PowerUp.pickType(types, 0).type, types[0].type);
  assert.equal(PowerUp.pickType(types, 0.9999).type, types.at(-1).type);
});

test('the magnet pulls falling power-ups toward the paddle', () => {
  const exports = load();
  const game = createGame(exports);
  clickAndStep(game);
  const paddleCenter = () => game.paddle.x + game.paddle.width / 2;
  const spawn = () => {
    const p = new exports.PowerUp(paddleCenter() - 300, 50, game.world);
    game.powerUps = [p];
    return p;
  };

  const free = spawn();
  game.updatePowerUps(0);
  assert.equal(free.x, paddleCenter() - 300, 'without the magnet it falls straight');

  game.collectPowerUp('magnet', 0);
  game.applyEffects(1);
  const pulled = spawn();
  game.updatePowerUps(1);
  const step = pulled.x - (paddleCenter() - 300);
  assert.ok(step > 0 && step <= exports.CONFIG.effects.magnetMaxSpeed, 'it drifts toward the paddle at a capped speed');
});

test('reverse controls mirror the paddle and turn its glow red', () => {
  const exports = load();
  const game = createGame(exports);
  clickAndStep(game);
  game.input.mouseX = 100;

  game.update(0);
  const normalX = game.paddle.x;
  game.collectPowerUp('reverse', 0);
  game.update(1);

  assert.equal(game.paddle.reversed, true);
  assert.ok(Math.abs((game.paddle.x + game.paddle.width / 2) - (game.world.width - 100)) < 1e-9, 'the paddle goes to the mirrored side');
  assert.notEqual(game.paddle.x, normalX);

  game.update(exports.CONFIG.effects.durationMs + 1);
  assert.equal(game.paddle.reversed, false, 'it wears off');
});

test('a partial hit chips a few sparks without the shockwave ring', () => {
  const { CONFIG, Particles } = load();
  const particles = new Particles();

  particles.burst(0, 0, 10, 10, 'red', 0.35);

  assert.equal(particles.sparks.length, Math.round(CONFIG.particles.count * 0.35));
  assert.equal(particles.rings.length, 0);
});
