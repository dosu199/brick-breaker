const MIN_BRICK_HEIGHT = 8;

class Brick {
  constructor(x, y, width, height, color) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = color;
    this.alive = true;
  }

  draw(ctx) {
    if (!this.alive) return;

    const panel = Assets.get(CONFIG.bricks.image);
    const key = `brick|${this.color}|${panel ? 'sprite' : 'shape'}`;
    drawCached(ctx, key, this.x, this.y, this.width, this.height, CONFIG.bricks.glowBlur,
      (target, x, y) => this.paint(target, x, y, panel));
  }

  paint(ctx, x, y, panel) {
    withGlow(ctx, this.color, CONFIG.bricks.glowBlur, () => {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.roundRect(x, y, this.width, this.height, 4);
      ctx.fill();
    });

    if (panel) ctx.drawImage(panel, x, y, this.width, this.height);
  }
}

class Bricks {
  constructor(world, map) {
    this.world = world;
    this.map = map;
    this.y = CONFIG.bricks.offsetTop;
    this.sideMargin = CONFIG.bricks.sideMargin;
    this.brickHeight = CONFIG.bricks.height;
    this.colors = CONFIG.bricks.colors;
    this.padding = CONFIG.bricks.padding;

    this.build();
  }

  build() {
    this.rows = this.map.length;
    this.cols = Math.max(...this.map.map(line => line.length));

    this.grid = this.map.map((line, row) =>
      Array.from({ length: this.cols }, (_, col) => line[col] === '#'
        ? new Brick(0, 0, 0, this.brickHeight, this.colors[row % this.colors.length])
        : null)
    );
    this.layout();
    return this.grid;
  }

  layout() {
    const { maxWidth, gapRatio } = CONFIG.bricks;
    const usableWidth = this.world.width - 2 * this.sideMargin;
    const gaps = this.cols - 1;

    let width = usableWidth / (this.cols + gaps * gapRatio);
    if (width * gapRatio < this.padding) width = (usableWidth - gaps * this.padding) / this.cols;
    this.brickWidth = Math.min(maxWidth, width);
    this.gap = Math.max(this.padding, this.brickWidth * gapRatio);

    const gridWidth = this.cols * this.brickWidth + gaps * this.gap;
    const left = (this.world.width - gridWidth) / 2;

    const maxGridHeight = this.world.height * CONFIG.bricks.maxGridHeightRatio - this.y;
    this.rowHeight = Math.max(MIN_BRICK_HEIGHT, Math.min(this.brickHeight, maxGridHeight / this.rows - this.padding));

    this.grid.forEach((row, rowIndex) => {
      row.forEach((brick, colIndex) => {
        if (!brick) return;
        brick.x = left + colIndex * (this.brickWidth + this.gap);
        brick.y = this.y + rowIndex * (this.rowHeight + this.padding);
        brick.width = this.brickWidth;
        brick.height = this.rowHeight;
      });
    });
  }

  remaining() {
    return this.grid.flat().filter(brick => brick?.alive).length;
  }

  draw(ctx) {
    for (const row of this.grid) {
      for (const brick of row) {
        brick?.draw(ctx);
      }
    }
  }
}
