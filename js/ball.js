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
    this.damage = 1;
    // Ricochet: wall bounces store charges up to `maxCharges`
    this.charges = 0;
    this.maxCharges = 0;
    this.spin = 0;
    this.trail = [];
  }

  // A second ball at the same spot, turned by `angle` either way. The turn
  // that keeps it moving more vertically wins, so it can't end up sliding
  // sideways forever.
  split(angle) {
    const copy = new Ball(this.world);
    Object.assign(copy, {
      x: this.x, y: this.y, speed: this.speed, speedScale: this.speedScale,
      fireball: this.fireball, damage: this.damage, maxCharges: this.maxCharges, spin: this.spin,
    });
    const turned = [angle, -angle].map(a => ({
      dx: this.dx * Math.cos(a) - this.dy * Math.sin(a),
      dy: this.dx * Math.sin(a) + this.dy * Math.cos(a),
    }));
    Object.assign(copy, Math.abs(turned[0].dy) >= Math.abs(turned[1].dy) ? turned[0] : turned[1]);
    return copy;
  }

  charge() {
    if (this.charges < this.maxCharges) this.charges++;
  }

  reset(paddle) {
    this.x = paddle.x + paddle.width / 2;
    this.y = paddle.y - this.radius;
    this.dx = this.speed;
    this.dy = -this.speed;
    this.spin = 0;
    this.trail = [];
  }

  // `spin` is the curve still to come, in radians: positive turns the path
  // clockwise on screen. The paddle brushes the ball the way it moves, so the
  // ball curves the other way: flicked right while going up, it bends left.
  // A flick sets the full curve, anything slower sends the ball straight.
  spinFromPaddle(paddle) {
    const { flickSpeed, curveAngle } = CONFIG.spin;
    this.spin = Math.abs(paddle.velocity) >= flickSpeed ? -Math.sign(paddle.velocity) * curveAngle : 0;
  }

  rotate(angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    [this.dx, this.dy] = [this.dx * cos - this.dy * sin, this.dx * sin + this.dy * cos];
  }

  // turn by a steady amount each tick until the whole curve is used up
  applySpin(step) {
    if (this.spin === 0) return;
    const { curveAngle, curveTicks } = CONFIG.spin;
    const turn = Math.sign(this.spin) * Math.min(Math.abs(this.spin), (curveAngle / curveTicks) * step);
    this.rotate(turn);
    this.spin -= turn;
    if (Math.abs(this.spin) < 1e-9) this.spin = 0;
    this.keepVertical();
  }

  // never let spin flatten the ball into an endless sideways rally
  keepVertical() {
    const speed = Math.hypot(this.dx, this.dy);
    const minDy = speed * CONFIG.spin.minVerticalRatio;
    if (Math.abs(this.dy) >= minDy) return;
    this.dy = (Math.sign(this.dy) || -1) * minDy;
    this.dx = (Math.sign(this.dx) || 1) * Math.sqrt(speed * speed - minDy * minDy);
  }

  recordTrail() {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > CONFIG.spin.trailLength) this.trail.shift();
  }

  distancePerTick() {
    return Math.hypot(this.dx, this.dy) * this.speedScale;
  }

  update(step = 1) {
    this.applySpin(step);
    this.x += this.dx * this.speedScale * step;
    this.y += this.dy * this.speedScale * step;

    const maxX = this.world.width - this.radius;
    if (this.x < this.radius) {
      this.x = this.radius;
      this.dx = Math.abs(this.dx);
      this.charge();
    } else if (this.x > maxX) {
      this.x = maxX;
      this.dx = -Math.abs(this.dx);
      this.charge();
    }
    if (this.y < this.radius) {
      this.y = this.radius;
      this.dy = Math.abs(this.dy);
      this.charge();
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

    if (this.spin !== 0) this.drawTrail(ctx);
    ctx.save();
    ctx.translate(this.x, this.y);
    if (this.fireball) ctx.rotate(Math.atan2(this.dy, this.dx));
    drawCached(ctx, key, -size / 2, -size / 2, size, size, glowBlur,
      (target, x, y) => withGlow(target, glowColor, glowBlur, () => this.paint(target, x, y, size, image)));
    if (this.charges > 0) this.drawCharges(ctx);
    ctx.restore();
  }

  // a fading tail that shows the curve; it dims as the curve runs out
  drawTrail(ctx) {
    const strength = Math.min(1, Math.abs(this.spin) / CONFIG.spin.curveAngle);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = CONFIG.spin.trailColor;
    this.trail.forEach(({ x, y }, i) => {
      const age = (i + 1) / this.trail.length;
      ctx.globalAlpha = 0.45 * strength * age;
      ctx.beginPath();
      ctx.arc(x, y, this.radius * (0.35 + 0.5 * age), 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();
  }

  // one ring per stored Ricochet charge
  drawCharges(ctx) {
    ctx.strokeStyle = CONFIG.ball.chargeColor;
    ctx.lineWidth = 2;
    for (let i = 0; i < this.charges; i++) {
      ctx.globalAlpha = 0.9 - i * 0.35;
      ctx.beginPath();
      ctx.arc(0, 0, this.radius + 4 + i * 4, 0, Math.PI * 2);
      ctx.stroke();
    }
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
