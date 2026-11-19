const assert = require('node:assert/strict');
const test = require('node:test');
const { loadScripts, createDrawingContext } = require('./helpers');

const FILES = ['config.js', 'assets.js', 'render.js', 'starfield.js', 'input.js', 'paddle.js', 'ball.js', 'bricks.js', 'collision.js', 'powerup.js', 'particles.js', 'relics.js', 'game.js'];

function load() {
  return loadScripts(FILES, ['CONFIG', 'Brick', 'Collision', 'Game', 'Relics'], { Math, window: { addEventListener() {} } });
}

function createGame(exports) {
  const canvas = {
    getContext: () => createDrawingContext(),
    clientWidth: 1200,
    clientHeight: 600,
    addEventListener() {},
  };
  return new exports.Game(canvas, { state: null, update(state) { this.state = state; } });
}

// play level 1 until it's cleared, which opens the upgrade screen at time `now`
function clearLevel(game, now = 0) {
  game.input.launchRequested = true;
  game.update(now);
  for (const brick of game.bricks.grid.flat()) {
    if (brick) brick.alive = false;
  }
  game.update(now);
}

function giveRelic(game, id, times = 1) {
  for (let i = 0; i < times; i++) game.relics.add(id);
}

test('offers are distinct and never include a maxed-out relic', () => {
  const { CONFIG, Relics } = load();
  const relics = new Relics();
  for (let i = 0; i < 3; i++) relics.add('wide');

  for (let i = 0; i < 50; i++) {
    const ids = relics.offer().map(r => r.id);
    assert.equal(ids.length, CONFIG.relics.choices);
    assert.equal(new Set(ids).size, ids.length);
    assert.ok(!ids.includes('wide'));
  }
});

test('a relic bonus is its value times how many are owned', () => {
  const { Relics } = load();
  const relics = new Relics([{ id: 'x', value: 0.25, maxStacks: 3 }]);

  assert.equal(relics.bonus('x'), 0);
  relics.add('x');
  relics.add('x');
  assert.equal(relics.bonus('x'), 0.5);
  assert.equal(relics.bonus('unknown'), 0);
});

test('clearing a level shows upgrade cards instead of starting the next level', () => {
  const exports = load();
  const game = createGame(exports);

  clearLevel(game);

  assert.equal(game.state, 'upgrade');
  assert.equal(game.level, 0);
  assert.equal(game.offers.length, exports.CONFIG.relics.choices);
});

test('a click right as the level clears is ignored, so a card is not picked by accident', () => {
  const exports = load();
  const game = createGame(exports);
  clearLevel(game, 1000);

  game.input.launchRequested = true;
  game.update(1000 + exports.CONFIG.relics.pickDelayMs - 1);

  assert.equal(game.state, 'upgrade');
  assert.equal(Object.keys(game.relics.owned).length, 0);
});

test('clicking picks the card under the paddle', () => {
  const exports = load();
  const game = createGame(exports);
  clearLevel(game);
  const offered = game.offers.map(r => r.id);
  const { cards } = game.cardLayout();
  game.input.mouseX = cards[2].x + cards[2].width / 2;

  game.input.launchRequested = true;
  game.update(exports.CONFIG.relics.pickDelayMs);

  assert.equal(game.level, 1);
  assert.equal(game.state, 'ready');
  assert.equal(game.relics.stacks(offered[2]), 1);
});

test('number keys pick a card directly', () => {
  const exports = load();
  const game = createGame(exports);
  clearLevel(game);
  const offered = game.offers.map(r => r.id);
  game.input.mouseX = 0;

  game.input.choiceRequested = 1;
  game.update(exports.CONFIG.relics.pickDelayMs);

  assert.equal(game.relics.stacks(offered[1]), 1);
  assert.equal(game.level, 1);
});

test('the upgrade screen draws every card with its name and wrapped description', () => {
  const exports = load();
  const game = createGame(exports);
  clearLevel(game);

  game.draw();

  for (const relic of game.offers) {
    assert.ok(game.ctx.texts.includes(relic.name));
  }
  assert.ok(game.ctx.texts.includes('LEVEL 1 CLEAR'));
});

test('a new run starts without relics', () => {
  const exports = load();
  const game = createGame(exports);
  giveRelic(game, 'greed');
  game.state = 'lost';

  game.input.launchRequested = true;
  game.update(0);

  assert.equal(game.relics.stacks('greed'), 0);
});

test('Spare Heart adds a life when picked', () => {
  const exports = load();
  const game = createGame(exports);
  clearLevel(game);
  game.offers = [exports.CONFIG.relics.pool.find(r => r.id === 'spareHeart')];

  game.pickRelic(0);

  assert.equal(game.lives, exports.CONFIG.lives + 1);
});

test('Wide Paddle stacks with the expand power-up', () => {
  const exports = load();
  const { CONFIG } = exports;
  const game = createGame(exports);
  giveRelic(game, 'wide', 2);

  game.applyEffects(0);
  assert.ok(Math.abs(game.paddle.width - CONFIG.paddle.width * 1.4) < 1e-9);

  game.collectPowerUp('expand', 0);
  game.applyEffects(1);
  assert.ok(Math.abs(game.paddle.width - CONFIG.paddle.width * 1.4 * CONFIG.effects.expandScale) < 1e-9);
});

test('Heavy Ball breaks a 3-hit armored brick in two hits', () => {
  const exports = load();
  const game = createGame(exports);
  giveRelic(game, 'heavy');
  game.applyEffects(0);
  const brick = new exports.Brick(100, 100, 60, 20, 'grey', 3);
  const hitFromBelow = () => {
    Object.assign(game.ball, { x: 130, y: 125, dx: 0, dy: -5 });
    return exports.Collision.ballBricks(game.ball, [[brick]])[0];
  };

  assert.equal(game.ball.damage, 2);
  assert.equal(hitFromBelow().damage, 2);
  assert.equal(hitFromBelow().damage, 1, 'damage is capped at what the brick has left');
  assert.equal(brick.alive, false);
});

test('Greed multiplies points, Lucky raises the drop chance', () => {
  const exports = load();
  const { CONFIG } = exports;
  const game = createGame(exports);
  giveRelic(game, 'greed');
  const brick = game.bricks.grid[0][0];

  game.handleBrickHits([{ brick, damage: 1, destroyed: false }]);
  assert.equal(game.score, CONFIG.bricks.points * 1.5);

  giveRelic(game, 'lucky', 3);
  assert.ok(Math.abs(game.relics.bonus('lucky') - 0.18) < 1e-9);
});

test('Long Fuse makes timed power-ups last longer', () => {
  const exports = load();
  const { CONFIG } = exports;
  const game = createGame(exports);
  giveRelic(game, 'longFuse');

  game.collectPowerUp('slow', 0);
  game.applyEffects(CONFIG.effects.durationMs + 1);

  assert.equal(game.ball.speedScale, CONFIG.effects.slowScale, 'still slow after the normal duration');
});

test('Steady Hand slows the ball for the rest of the run', () => {
  const exports = load();
  const { CONFIG } = exports;
  const game = createGame(exports);
  giveRelic(game, 'steady');

  game.startLevel(0);

  assert.ok(Math.abs(game.ball.speed - CONFIG.ball.speed * 0.92) < 1e-9);
});

test('Safety Net raises a barrier on every launch', () => {
  const exports = load();
  const game = createGame(exports);
  giveRelic(game, 'safetyNet');

  game.input.launchRequested = true;
  game.update(1000);

  assert.equal(game.state, 'playing');
  assert.equal(game.barrierRemaining, 6000);
});

// a Math whose random() always returns `value`, so chance rolls are predictable
function fixedRandom(value) {
  return Object.assign(Object.create(Math), { random: () => value });
}

function loadWith(globals) {
  return loadScripts(FILES, ['CONFIG', 'Ball', 'Brick', 'Collision', 'Game', 'Relics'], { Math, window: { addEventListener() {} }, ...globals });
}

function breakBrick(game, brick, ball) {
  brick.hit(brick.hitsLeft);
  game.handleBrickHits([{ brick, damage: 1, destroyed: true }], ball);
}

test('offers are drawn by rarity weight', () => {
  const { Relics } = load();
  const pool = [
    { id: 'legend', rarity: 'legendary', maxStacks: 1 },
    { id: 'plain', maxStacks: 1 },
  ];
  // weights are 1 and 6: a roll in the first 1/7 picks the legendary
  assert.equal(new Relics(pool).offer(1, () => 0.1)[0].id, 'legend');
  assert.equal(new Relics(pool).offer(1, () => 0.2)[0].id, 'plain');
  assert.equal(new Relics(pool).offer(5, () => 0.5).map(r => r.id).sort().join(), 'legend,plain');
});

test('Glass Cannon blocks Spare Heart from being offered', () => {
  const { Relics } = load();
  const relics = new Relics();
  relics.add('glassCannon');

  for (let i = 0; i < 50; i++) {
    assert.ok(!relics.offer().some(r => r.id === 'spareHeart'));
  }
});

test('Glass Cannon drops you to one life, keeps you there, and doubles damage and points', () => {
  const exports = load();
  const { CONFIG } = exports;
  const game = createGame(exports);
  clearLevel(game);
  game.offers = [CONFIG.relics.pool.find(r => r.id === 'glassCannon')];
  game.pickRelic(0);

  assert.equal(game.lives, 1);
  game.collectPowerUp('extraLife', 0);
  assert.equal(game.lives, 1, 'extra lives are wasted');

  game.applyEffects(0);
  assert.equal(game.ball.damage, 2);
  const brick = game.bricks.grid.flat().find(Boolean);
  game.handleBrickHits([{ brick, damage: 1, destroyed: false }]);
  assert.equal(game.score, CONFIG.bricks.points * 2);
});

test('Echo doubles power-up durations and extra lives', () => {
  const exports = load();
  const { CONFIG } = exports;
  const game = createGame(exports);
  giveRelic(game, 'echo');

  game.collectPowerUp('extraLife', 0);
  assert.equal(game.lives, CONFIG.lives + 2);

  game.collectPowerUp('slow', 0);
  game.applyEffects(CONFIG.effects.durationMs * 2 - 1);
  assert.equal(game.ball.speedScale, CONFIG.effects.slowScale);
});

test('Volatile explosions chain through neighbouring bricks', () => {
  const exports = loadWith({ Math: fixedRandom(0) });
  const game = createGame(exports);
  giveRelic(game, 'volatile');

  breakBrick(game, game.bricks.grid[0][0]);

  assert.equal(game.bricks.remaining(), 0, 'every roll explodes, so the whole wall goes');
  assert.ok(game.combo > 1, 'explosion hits count toward the combo');
});

test('without Volatile a broken brick does not hurt its neighbours', () => {
  const exports = loadWith({ Math: fixedRandom(0) });
  const game = createGame(exports);
  const total = game.bricks.remaining();

  breakBrick(game, game.bricks.grid[0][0]);

  assert.equal(game.bricks.remaining(), total - 1);
});

test('Splitter splits the ball every 12 broken bricks, every 6 with two copies', () => {
  const exports = load();
  const { CONFIG } = exports;
  const game = createGame(exports);
  const bricks = game.bricks.grid.flat().filter(Boolean);
  giveRelic(game, 'splitter');

  bricks.slice(0, CONFIG.relics.splitEvery - 1).forEach(b => breakBrick(game, b));
  assert.equal(game.balls.length, 1);
  breakBrick(game, bricks[CONFIG.relics.splitEvery - 1]);
  assert.equal(game.balls.length, 2);

  giveRelic(game, 'splitter');
  bricks.slice(20, 26).forEach(b => breakBrick(game, b));
  assert.equal(game.balls.length, 3);
});

test('a split ball heads off at an angle, never flatter than the original', () => {
  const { Ball } = loadWith({});
  const ball = new Ball({ width: 700, height: 400 });
  Object.assign(ball, { x: 100, y: 100, dx: 5, dy: -5 });

  const copy = ball.split(0.35);

  assert.ok(Math.abs(Math.hypot(copy.dx, copy.dy) - Math.hypot(5, 5)) < 1e-9, 'same speed');
  assert.ok(Math.abs(copy.dy) > Math.abs(ball.dy), 'turned toward vertical');
  assert.equal(copy.x, 100);
  assert.equal(copy.y, 100);
});

test('losing one of several balls does not cost a life', () => {
  const exports = load();
  const game = createGame(exports);
  game.input.launchRequested = true;
  game.update(0);
  game.balls.push(game.ball.split(0.35));

  game.balls[0].y = game.world.height + 100;
  game.update(10);

  assert.equal(game.balls.length, 1);
  assert.equal(game.lives, exports.CONFIG.lives);
  assert.equal(game.state, 'playing');
});

test('Ricochet: wall bounces charge the ball, and a charged ball smashes through a brick', () => {
  const exports = loadWith({});
  const { Ball, Brick, Collision } = exports;
  const world = { width: 700, height: 400 };
  const ball = new Ball(world);
  ball.maxCharges = 2;

  for (let i = 0; i < 3; i++) {
    Object.assign(ball, { x: world.width - 1, y: 200, dx: 5, dy: -5 });
    ball.update();
  }
  assert.equal(ball.charges, 2, 'charges are capped');

  const brick = new Brick(100, 100, 60, 20, 'red');
  Object.assign(ball, { x: 130, y: 125, dx: 0, dy: -5 });
  Collision.ballBricks(ball, [[brick]]);

  assert.equal(brick.alive, false);
  assert.equal(ball.dy, -5, 'no bounce');
  assert.equal(ball.charges, 1);
});

test('the combo multiplier grows with hits and resets when the ball touches the paddle', () => {
  const exports = load();
  const { CONFIG } = exports;
  const game = createGame(exports);
  game.input.launchRequested = true;
  game.update(0);
  const { hitsPerStep, stepBonus, maxMultiplier } = CONFIG.combo;
  const brick = game.bricks.grid[0][0];

  for (let i = 0; i < hitsPerStep; i++) game.handleBrickHits([{ brick, damage: 1, destroyed: false }]);
  assert.equal(game.comboMultiplier(), 1 + stepBonus);
  assert.equal(game.comboMultiplier(1000), maxMultiplier, 'capped');

  const before = game.score;
  game.handleBrickHits([{ brick, damage: 1, destroyed: false }]);
  assert.equal(game.score - before, CONFIG.bricks.points * (1 + stepBonus));
  game.draw();
  assert.ok(game.ctx.texts.includes(`×${1 + stepBonus}`), 'the multiplier is drawn');

  const { paddle, ball } = game;
  Object.assign(ball, { x: paddle.x + paddle.width / 2, y: paddle.y - ball.radius - 1, dx: 0, dy: 3 });
  game.update(0);
  assert.equal(game.combo, 0);
  assert.equal(game.bestCombo, hitsPerStep + 1);
});
