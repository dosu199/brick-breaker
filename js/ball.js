class Ball {
  constructor(world) {
    this.world = world;
    this.radius = CONFIG.ball.radius;
    this.x = 0;
    this.y = 0;
    this.dx = 0;
    this.dy = 0;
    this.speed = CONFIG.ball.speed;
    this.speedScale = 1;
    this.fireball = false;
  }

  reset(paddle) {
    this.x = paddle.x + paddle.width / 2;
    this.y = paddle.y - this.radius;
    this.dx = this.speed;
    this.dy = -this.speed;
  }

  update() {
    this.x += this.dx * this.speedScale;
    this.y += this.dy * this.speedScale;

    const maxX = this.world.width - this.radius;
    if (this.x < this.radius) {
      this.x = this.radius;
      this.dx = Math.abs(this.dx);
    } else if (this.x > maxX) {
      this.x = maxX;
      this.dx = -Math.abs(this.dx);
    }
    if (this.y < this.radius) {
      this.y = this.radius;
      this.dy = Math.abs(this.dy);
    }
  }

  isBelowScreen() {
    return this.y - this.radius > this.world.height;
  }

  draw(ctx) {
    const { glowBlur } = CONFIG.ball;
    const glowColor = this.fireball ? CONFIG.ball.fireballGlowColor : CONFIG.ball.glowColor;
    const image = Assets.get(this.fireball ? CONFIG.ball.fireballImage : CONFIG.ball.image);
    const scale = this.fireball && image ? CONFIG.ball.fireballSpriteScale : 1;
    const size = this.radius * 2 * scale;
    const key = `ball|${this.fireball ? 'fire' : 'normal'}|${image ? 'sprite' : 'shape'}`;

    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.fireball) ctx.rotate(Math.atan2(this.dy, this.dx));
    drawCached(ctx, key, -size / 2, -size / 2, size, size, glowBlur,
      (target, x, y) => withGlow(target, glowColor, glowBlur, () => this.paint(target, x, y, size, image)));
    ctx.restore();
  }

  paint(ctx, x, y, size, image) {
    if (image) {
      ctx.drawImage(image, x, y, size, size);
      return;
    }

    ctx.fillStyle = this.fireball ? CONFIG.ball.fireballColor : CONFIG.ball.color;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
    ctx.fill();
  }
}
