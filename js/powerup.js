class PowerUp {
  static weight(type) {
    return CONFIG.powerUps.rarity[type.rarity];
  }

  static pickType(types = CONFIG.powerUps.types, roll = Math.random()) {
    const total = types.reduce((sum, type) => sum + PowerUp.weight(type), 0);
    let remaining = roll * total;
    return types.find(type => (remaining -= PowerUp.weight(type)) < 0) ?? types.at(-1);
  }

  constructor(x, y, world) {
    const pick = PowerUp.pickType();

    this.world = world;
    this.x = x;
    this.y = y;
    this.type = pick.type;
    this.color = pick.color;
    this.image = pick.image;
    this.radius = CONFIG.powerUps.radius;
    this.alive = true;
  }

  update() {
    this.y += CONFIG.powerUps.fallSpeed;
  }

  isBelowScreen() {
    return this.y - this.radius > this.world.height;
  }

  draw(ctx) {
    const { glowBlur } = CONFIG.powerUps;
    const image = Assets.get(this.image);
    const size = this.radius * 2;
    const key = `powerUp|${this.type}|${image ? 'sprite' : 'shape'}`;
    drawCached(ctx, key, this.x - this.radius, this.y - this.radius, size, size, glowBlur,
      (target, x, y) => withGlow(target, this.color, glowBlur, () => this.paint(target, x, y, image)));
  }

  paint(ctx, x, y, image) {
    const size = this.radius * 2;
    if (image) {
      ctx.drawImage(image, x, y, size, size);
      return;
    }

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(x + this.radius, y + this.radius, this.radius, 0, Math.PI * 2);
    ctx.fill();
  }
}
