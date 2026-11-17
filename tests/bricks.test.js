const assert = require('node:assert/strict');
const test = require('node:test');
const { loadScripts, createDrawingContext } = require('./helpers');

const NoopEntity = class {
  update() {}
  draw() {}
  setScale() {}
};

const WORLD = { width: 700, height: 400 };

function loadClasses() {
  return loadScripts(['config.js', 'assets.js', 'render.js', 'bricks.js', 'game.js'], ['CONFIG', 'Brick', 'Bricks', 'Game'], {
    Input: class { consumeLaunch() { return false; } },
    Paddle: NoopEntity,
    Ball: NoopEntity,
    Starfield: class extends NoopEntity { resize() {} },
  });
}

test('construction fits as many target-width columns as the world allows', () => {
  const { CONFIG, Brick, Bricks } = loadClasses();
  const bricks = new Bricks({ ...WORLD });
  const settings = CONFIG.bricks;
  const cols = Math.floor((WORLD.width - 2 * settings.sideMargin + settings.padding) / (settings.width + settings.padding));
  const brickWidth = (WORLD.width - 2 * settings.sideMargin - (cols - 1) * settings.padding) / cols;

  assert.equal(bricks.cols, cols);
  assert.ok(brickWidth >= settings.width && brickWidth < settings.width + (settings.width + settings.padding) / cols);

  assert.equal(bricks.grid.length, settings.rows);
  assert.notEqual(bricks.grid[0], bricks.grid[1]);
  assert.notEqual(bricks.grid[0][0], bricks.grid[0][1]);
  assert.equal(bricks.remaining(), settings.rows * cols);

  for (let row = 0; row < settings.rows; row++) {
    assert.equal(bricks.grid[row].length, cols);
    for (let col = 0; col < cols; col++) {
      const brick = bricks.grid[row][col];
      assert.ok(brick instanceof Brick);
      assert.equal(brick.x, settings.sideMargin + col * (brickWidth + settings.padding));
      assert.equal(brick.y, settings.offsetTop + row * (settings.height + settings.padding));
      assert.equal(brick.width, brickWidth);
      assert.equal(brick.height, settings.height);
      assert.equal(brick.color, settings.colors[row % settings.colors.length]);
      assert.equal(brick.alive, true);
    }
  }

  const lastBrick = bricks.grid[0][cols - 1];
  assert.ok(Math.abs(lastBrick.x + lastBrick.width - (WORLD.width - settings.sideMargin)) < 1e-9);
});

test('build uses instance settings, cycles colors, and resets the board', () => {
  const { Bricks } = loadClasses();
  const bricks = new Bricks({ width: 67, height: 400 });
  const oldBrick = bricks.grid[0][0];
  oldBrick.alive = false;
  Object.assign(bricks, {
    y: 24, sideMargin: 12, rows: 3, targetWidth: 20,
    brickHeight: 10, padding: 3,
    colors: ['red', 'blue'],
  });

  bricks.build();

  assert.notEqual(bricks.grid[0][0], oldBrick);
  assert.equal(bricks.remaining(), 6);
  assert.deepEqual(Array.from(bricks.grid, row =>
    Array.from(row, brick => [
      brick.x, brick.y, brick.width, brick.height, brick.color, brick.alive,
    ])
  ), [
    [[12, 24, 20, 10, 'red', true], [35, 24, 20, 10, 'red', true]],
    [[12, 37, 20, 10, 'blue', true], [35, 37, 20, 10, 'blue', true]],
    [[12, 50, 20, 10, 'red', true], [35, 50, 20, 10, 'red', true]],
  ]);
});

test('layout after a resize stretches bricks and keeps destroyed ones destroyed', () => {
  const { Bricks } = loadClasses();
  const world = { ...WORLD };
  const bricks = new Bricks(world);
  const brick = bricks.grid[1][2];
  const oldWidth = brick.width;
  brick.alive = false;

  world.width = 1400;
  bricks.layout();

  assert.equal(bricks.grid[1][2], brick);
  assert.equal(brick.alive, false);
  assert.ok(brick.width > oldWidth);
  const last = bricks.grid[0][bricks.cols - 1];
  assert.ok(Math.abs(last.x + last.width - (world.width - bricks.sideMargin)) < 1e-9);
});

test('a brick draws itself only while alive', () => {
  const { Brick } = loadClasses();
  const brick = new Brick(10, 20, 30, 40, 'red');
  const ctx = createDrawingContext();

  brick.draw(ctx);
  assert.deepEqual(ctx.rectangles, [
    { x: 10, y: 20, width: 30, height: 40, color: 'red' },
  ]);

  brick.alive = false;
  ctx.clearRect();
  ctx.fillStyle = 'blue';
  brick.draw(ctx);
  assert.equal(ctx.rectangles.length, 0);
  assert.equal(ctx.fillStyle, 'blue');
});

test('drawing uses stored positions and preserves dead or missing bricks across frames', () => {
  const { Bricks } = loadClasses();
  const bricks = new Bricks({ ...WORLD });
  const firstBrick = bricks.grid[0][0];
  firstBrick.x = 101;
  firstBrick.y = 202;
  bricks.grid[0][1].alive = false;
  bricks.grid[1][0] = null;
  const before = JSON.stringify(bricks.grid);
  const ctx = createDrawingContext();

  bricks.draw(ctx);
  const firstFrame = ctx.rectangles.slice();
  assert.equal(firstFrame.length, bricks.rows * bricks.cols - 2);
  assert.deepEqual(firstFrame[0], {
    x: firstBrick.x, y: firstBrick.y,
    width: firstBrick.width, height: firstBrick.height, color: firstBrick.color,
  });

  ctx.clearRect();
  bricks.draw(ctx);
  assert.deepEqual(ctx.rectangles, firstFrame);
  assert.equal(JSON.stringify(bricks.grid), before);
  assert.equal(bricks.remaining(), bricks.rows * bricks.cols - 2);

  for (const row of bricks.grid) {
    for (const brick of row) {
      if (brick) brick.alive = false;
    }
  }
  ctx.clearRect();
  bricks.draw(ctx);
  assert.equal(ctx.rectangles.length, 0);
  assert.equal(bricks.remaining(), 0);
});

test('game drawing never rebuilds or revives destroyed bricks', () => {
  const { CONFIG, Game } = loadClasses();
  const ctx = createDrawingContext();
  const game = new Game({
    clientWidth: 700,
    clientHeight: 400,
    getContext: () => ctx,
  }, { score: {}, lives: {} });
  const grid = game.bricks.grid;
  const brick = grid[0][0];
  brick.alive = false;

  game.draw();
  const firstFrame = ctx.rectangles.slice();
  game.draw();

  assert.equal(game.bricks.grid, grid);
  assert.equal(game.bricks.grid[0][0], brick);
  assert.equal(brick.alive, false);
  assert.equal(game.bricks.remaining(), CONFIG.bricks.rows * game.bricks.cols - 1);
  assert.equal(ctx.rectangles.length, game.bricks.remaining());
  assert.deepEqual(ctx.rectangles, firstFrame);
});
