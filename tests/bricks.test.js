const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

const source = ['config.js', 'bricks.js', 'game.js']
  .map(file => readFileSync(path.join(__dirname, '..', 'js', file), 'utf8'))
  .join('\n');

function loadClasses() {
  return vm.runInNewContext(`${source}\n({ CONFIG, Brick, Bricks, Game });`, {
    Input: class {},
    Paddle: class {},
    Ball: class {},
  });
}

function createDrawingContext() {
  return {
    rectangles: [],
    fillStyle: '',
    fillRect(x, y, width, height) {
      this.rectangles.push({ x, y, width, height, color: this.fillStyle });
    },
    clearRect() {
      this.rectangles.length = 0;
    },
  };
}

test('construction builds distinct bricks at the configured offsets', () => {
  const { CONFIG, Brick, Bricks } = loadClasses();
  const bricks = new Bricks();
  const settings = CONFIG.bricks;

  assert.equal(bricks.grid.length, settings.rows);
  assert.notEqual(bricks.grid[0], bricks.grid[1]);
  assert.notEqual(bricks.grid[0][0], bricks.grid[0][1]);
  assert.equal(bricks.remaining(), settings.rows * settings.cols);

  for (let row = 0; row < settings.rows; row++) {
    assert.equal(bricks.grid[row].length, settings.cols);
    for (let col = 0; col < settings.cols; col++) {
      const brick = bricks.grid[row][col];
      assert.ok(brick instanceof Brick);
      assert.equal(brick.x, settings.offsetLeft + col * (settings.width + settings.padding));
      assert.equal(brick.y, settings.offsetTop + row * (settings.height + settings.padding));
      assert.equal(brick.width, settings.width);
      assert.equal(brick.height, settings.height);
      assert.equal(brick.color, settings.colors[row % settings.colors.length]);
      assert.equal(brick.alive, true);
    }
  }
});

test('build uses instance settings, cycles colors, and resets the board', () => {
  const { Bricks } = loadClasses();
  const bricks = new Bricks();
  const oldBrick = bricks.grid[0][0];
  oldBrick.alive = false;
  Object.assign(bricks, {
    x: 12, y: 24, rows: 3, cols: 2,
    brickWidth: 20, brickHeight: 10, padding: 3,
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
  const bricks = new Bricks();
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
    width: CONFIG.canvas.width,
    height: CONFIG.canvas.height,
    getContext: () => ctx,
  });
  const grid = game.bricks.grid;
  const brick = grid[0][0];
  brick.alive = false;

  game.draw();
  const firstFrame = ctx.rectangles.slice();
  game.draw();

  assert.equal(game.bricks.grid, grid);
  assert.equal(game.bricks.grid[0][0], brick);
  assert.equal(brick.alive, false);
  assert.equal(game.bricks.remaining(), CONFIG.bricks.rows * CONFIG.bricks.cols - 1);
  assert.equal(ctx.rectangles.length, game.bricks.remaining());
  assert.deepEqual(ctx.rectangles, firstFrame);
});
