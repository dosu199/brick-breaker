class Brick {
  constructor(x, y, width, height, color, grid) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = color;
    this.alive = true;
    this.grid = grid;
  }

    draw(ctx) {
    if (!this.alive) return;

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width, this.height, 4);
    ctx.fill();
  }
}

class Bricks {
  constructor() {
    this.x = CONFIG.bricks.offsetLeft;
    this.y = CONFIG.bricks.offsetTop;
    this.brickWidth = CONFIG.bricks.width;
    this.brickHeight = CONFIG.bricks.height;
    this.rows = CONFIG.bricks.rows;
    this.cols = CONFIG.bricks.cols;
    this.colors = CONFIG.bricks.colors;
    this.padding = CONFIG.bricks.padding;

    this.grid = this.build();
  }

  build() {
    this.grid = Array.from({ length: this.rows }, (_, row) =>
      Array.from({ length: this.cols }, (_, col) => new Brick(
        this.x + col * (this.brickWidth + this.padding),
        this.y + row * (this.brickHeight + this.padding),
        this.brickWidth,
        this.brickHeight,
        this.colors[row % this.colors.length]
      ))
    );
    return this.grid;
  }

  remaining() {
    let count = 0;

    for (const row of this.grid) {
      for (const brick of row) {
        if (brick && brick.alive) {
          count++;
        }
      }
    }

    return count;
  }

  draw(ctx) {
    for (const row of this.grid) {
      for (const brick of row) {
        if (brick) {
          brick.draw(ctx);
        }
      }
    }
  }
}
