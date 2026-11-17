class Paddle {
  constructor(world) {
    this.world = world;
    this.width = CONFIG.paddle.width;
    this.height = CONFIG.paddle.height;
    this.x = (world.width - this.width) / 2;
    this.color = CONFIG.paddle.color;
  }

  get y() {
    return this.world.height - this.height - CONFIG.paddle.bottomMargin;
  }

  setScale(scale) {
    this.width = CONFIG.paddle.width * scale;
  }

  update(input) {
    const maxX = this.world.width - this.width;
    this.x = Math.max(0, Math.min(maxX, input.mouseX - this.width / 2));
  }

  draw(ctx) {
    const { glowColor, glowBlur } = CONFIG.paddle;
    const image = Assets.get(CONFIG.paddle.image);
    const key = `paddle|${image ? 'sprite' : 'shape'}`;
    drawCached(ctx, key, this.x, this.y, this.width, this.height, glowBlur,
      (target, x, y) => withGlow(target, glowColor, glowBlur, () => this.paint(target, x, y, image)));
  }

  paint(ctx, x, y, image) {
    if (image) {
      this.paintSprite(ctx, x, y, image);
      return;
    }

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.roundRect(x, y, this.width, this.height, this.height / 2);
    ctx.fill();
  }

  paintSprite(ctx, x, y, image) {
    const srcW = image.naturalWidth;
    const srcH = image.naturalHeight;
    const srcCap = srcH;
    const cap = this.height;
    const middle = this.width - 2 * cap;

    ctx.drawImage(image, 0, 0, srcCap, srcH, x, y, cap, this.height);
    ctx.drawImage(image, srcCap, 0, srcW - 2 * srcCap, srcH, x + cap, y, middle, this.height);
    ctx.drawImage(image, srcW - srcCap, 0, srcCap, srcH, x + cap + middle, y, cap, this.height);
  }
}
