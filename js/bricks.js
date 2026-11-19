const MIN_BRICK_HEIGHT = 8;

class Brick {
  constructor(x, y, width, height, color, hits = 1) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
    this.color = color;
    this.maxHits = hits;
    this.hitsLeft = hits;
    this.alive = true;
  }

  isArmored() {
    return this.maxHits > 1;
  }

  hit(damage = 1) {
    const dealt = Math.min(damage, this.hitsLeft);
    this.hitsLeft -= dealt;
    if (this.hitsLeft <= 0) this.alive = false;
    return dealt;
  }

  crackStage() {
    const damage = this.maxHits - this.hitsLeft;
    if (damage === 0) return 0;
    const stages = CONFIG.bricks.crackImages.length;
    return Math.min(stages, Math.ceil((damage / (this.maxHits - 1)) * stages));
  }

  draw(ctx) {
    if (!this.alive) return;

    const panel = Assets.get(CONFIG.bricks.image);
    const stage = this.crackStage();
    const key = `brick|${this.color}|${this.maxHits}|${stage}|${panel ? 'sprite' : 'shape'}`;
    drawCached(ctx, key, this.x, this.y, this.width, this.height, CONFIG.bricks.glowBlur,
      (target, x, y) => this.paint(target, x, y, panel, stage));
  }

  paint(ctx, x, y, panel, stage = 0) {
    withGlow(ctx, this.color, CONFIG.bricks.glowBlur, () => {
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.roundRect(x, y, this.width, this.height, 4);
      ctx.fill();
    });

    const overlays = [panel];
    if (this.isArmored()) overlays.push(Assets.get(CONFIG.bricks.armorImage));
    if (stage > 0) overlays.push(Assets.get(CONFIG.bricks.crackImages[stage - 1]));
    for (const image of overlays) {
      if (image) ctx.drawImage(image, x, y, this.width, this.height);
    }
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
      Array.from({ length: this.cols }, (_, col) => {
        const brick = this.createBrick(line[col], row);
        if (brick) Object.assign(brick, { row, col });
        return brick;
      })
    );
    this.layout();
    return this.grid;
  }

  createBrick(cell, row) {
    if (cell === '#') return new Brick(0, 0, 0, this.brickHeight, this.colors[row % this.colors.length]);
    const hits = Number(cell);
    if (hits > 0) return new Brick(0, 0, 0, this.brickHeight, CONFIG.bricks.armorColor, hits);
    return null;
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

    const paddleTop = this.world.height - CONFIG.paddle.height - CONFIG.paddle.bottomMargin;
    const maxGridHeight = paddleTop - CONFIG.bricks.minPaddleGap - this.y;
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

  // The up to 8 live bricks touching this one.
  neighbors(brick) {
    const found = [];
    for (let row = brick.row - 1; row <= brick.row + 1; row++) {
      for (let col = brick.col - 1; col <= brick.col + 1; col++) {
        const other = this.grid[row]?.[col];
        if (other?.alive && other !== brick) found.push(other);
      }
    }
    return found;
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
