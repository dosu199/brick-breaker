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
  constructor(world) {
    this.world = world;
    this.y = CONFIG.bricks.offsetTop;
    this.sideMargin = CONFIG.bricks.sideMargin;
    this.targetWidth = CONFIG.bricks.width;
    this.brickHeight = CONFIG.bricks.height;
    this.rows = CONFIG.bricks.rows;
    this.colors = CONFIG.bricks.colors;
    this.padding = CONFIG.bricks.padding;

    this.build();
  }

  build() {
    const usableWidth = this.world.width - 2 * this.sideMargin + this.padding;
    this.cols = Math.max(1, Math.floor(usableWidth / (this.targetWidth + this.padding)));

    this.grid = Array.from({ length: this.rows }, (_, row) =>
      Array.from({ length: this.cols }, () => new Brick(0, 0, 0, this.brickHeight, this.colors[row % this.colors.length]))
    );
    this.layout();
    return this.grid;
  }

  layout() {
    const usableWidth = this.world.width - 2 * this.sideMargin - (this.cols - 1) * this.padding;
    this.brickWidth = usableWidth / this.cols;

    this.grid.forEach((row, rowIndex) => {
      row.forEach((brick, colIndex) => {
        if (!brick) return;
        brick.x = this.sideMargin + colIndex * (this.brickWidth + this.padding);
        brick.y = this.y + rowIndex * (this.brickHeight + this.padding);
        brick.width = this.brickWidth;
        brick.height = this.brickHeight;
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
