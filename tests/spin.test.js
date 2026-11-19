const assert = require('node:assert/strict');
const test = require('node:test');
const { loadScripts, createDrawingContext } = require('./helpers');

const WORLD = { width: 700, height: 400 };
const FILES = ['config.js', 'assets.js', 'render.js', 'starfield.js', 'input.js', 'paddle.js', 'ball.js', 'bricks.js', 'collision.js', 'powerup.js', 'particles.js', 'relics.js', 'game.js'];

function load() {
  return loadScripts(FILES, ['CONFIG', 'Ball', 'Brick', 'Collision', 'Game', 'Paddle'], { Math, window: { addEventListener() {} } });
}

function createGame(exports) {
  const canvas = {
    getContext: () => createDrawingContext(),
    clientWidth: WORLD.width,
    clientHeight: WORLD.height,
    addEventListener() {},
  };
  return new exports.Game(canvas, { update() {} });
}

const near = (a, b) => Math.abs(a - b) < 1e-9;

test('the paddle tracks how fast it is moving', () => {
  const { Paddle } = load();
  const paddle = new Paddle({ ...WORLD });
  paddle.update({ mouseX: 300 });

  for (let i = 0; i < 20; i++) paddle.update({ mouseX: 310 + i * 10 });
  assert.ok(Math.abs(paddle.velocity - 10) < 1e-3, 'settles on the movement per tick');

  for (let i = 0; i < 40; i++) paddle.update({ mouseX: 500 });
  assert.ok(Math.abs(paddle.velocity) < 1e-6, 'and back to zero when it stops');
});

test('a flick as the paddle hits the ball curves it by the full angle, a slow move does not', () => {
  const exports = load();
  const { CONFIG, Collision } = exports;
  const game = createGame(exports);
  game.input.launchRequested = true;
  game.update(0);
  const { paddle, ball } = game;
  const hitWith = velocity => {
    paddle.velocity = velocity;
    Object.assign(ball, { x: paddle.x + paddle.width / 2, y: paddle.y - ball.radius + 1, dx: 0, dy: 3, spin: 0 });
    Collision.ballPaddle(ball, paddle) && ball.spinFromPaddle(paddle);
    return ball.spin;
  };

  assert.equal(hitWith(CONFIG.spin.flickSpeed), -CONFIG.spin.curveAngle, 'flick right, curve left');
  assert.equal(hitWith(-100), CONFIG.spin.curveAngle, 'flick left, curve right, and a harder flick curves the same amount');
  assert.equal(hitWith(CONFIG.spin.flickSpeed - 0.1), 0, 'too slow to count as a flick');

  // and through the real game loop
  paddle.velocity = 20;
  Object.assign(ball, { x: paddle.x + paddle.width / 2, y: paddle.y - ball.radius - 1, dx: 0, dy: 3, spin: 0 });
  game.moveBall(ball);
  assert.ok(ball.spin < 0, 'a right flick curves left');
});

test('a curved ball turns by exactly the curve angle, evenly, then flies straight', () => {
  const { CONFIG, Ball } = load();
  const { curveAngle, curveTicks } = CONFIG.spin;
  const ball = new Ball({ width: 100000, height: 100000 });
  Object.assign(ball, { x: 50000, y: 50000, dx: 0, dy: -10, spin: curveAngle });
  const heading = () => Math.atan2(ball.dx, -ball.dy);

  ball.update();
  assert.ok(near(heading(), curveAngle / curveTicks), 'an even share each tick, bending right');
  assert.ok(near(Math.hypot(ball.dx, ball.dy), 10), 'speed is unchanged');

  for (let i = 1; i < curveTicks; i++) ball.update();
  assert.ok(near(heading(), curveAngle), 'the whole angle once the curve ends');
  assert.equal(ball.spin, 0);

  ball.update();
  assert.ok(near(heading(), curveAngle), 'then straight');
});

test('a curve never flattens the ball into a sideways path', () => {
  const { CONFIG, Ball } = load();
  const ball = new Ball({ width: 100000, height: 100000 });
  Object.assign(ball, { x: 50000, y: 50000, dx: 9, dy: -4.4, spin: CONFIG.spin.curveAngle });

  for (let i = 0; i < CONFIG.spin.curveTicks; i++) {
    ball.update();
    assert.ok(Math.abs(ball.dy) >= Math.hypot(ball.dx, ball.dy) * CONFIG.spin.minVerticalRatio - 1e-9);
  }
});

test('walls keep the curve going, a brick bounce ends it', () => {
  const { CONFIG, Ball, Brick, Collision } = load();
  const ball = new Ball({ ...WORLD });
  Object.assign(ball, { x: 1, y: 200, dx: -5, dy: -3, spin: 0.3 });
  ball.update();
  assert.ok(ball.dx > 0, 'bounced off the wall');
  assert.ok(ball.spin > 0 && ball.spin < 0.3, 'still curving');

  const brick = new Brick(100, 100, 60, 20, 'red', 3);
  Object.assign(ball, { x: 130, y: 125, dx: 0, dy: -5 });
  Collision.ballBricks(ball, [[brick]]);
  assert.equal(ball.spin, 0);
});

test('a ball without spin bounces off walls exactly as before', () => {
  const { Ball } = load();
  const ball = new Ball({ ...WORLD });
  Object.assign(ball, { x: 1, y: 200, dx: -5, dy: -3 });

  ball.update();

  assert.equal(ball.dx, 5);
  assert.equal(ball.dy, -3);
});

test('a spinning ball draws a trail, a straight one does not', () => {
  const { Ball } = load();
  const ball = new Ball({ ...WORLD });
  Object.assign(ball, { x: 100, y: 100 });
  for (let i = 0; i < 5; i++) ball.recordTrail();
  let arcs = 0;
  const ctx = { ...createDrawingContext(), arc() { arcs++; } };

  ball.draw(ctx);
  const ballArcs = arcs;

  ball.spin = 0.02;
  arcs = 0;
  ball.draw(ctx);
  assert.equal(arcs - ballArcs, 5, 'one dot per trail point');
});

test('a ball waiting on the paddle has no spin', () => {
  const exports = load();
  const game = createGame(exports);
  game.ball.spin = 0.02;
  game.ball.recordTrail();

  game.update(0);

  assert.equal(game.ball.spin, 0);
  assert.equal(game.ball.trail.length, 0);
});
