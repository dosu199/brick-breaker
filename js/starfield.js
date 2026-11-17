const BRIGHTNESS_LEVELS = 8;
const MAX_BRIGHTNESS = 0.8;

class Starfield {
  constructor(world) {
    this.world = world;
    this.resize();
  }

  resize() {
    const count = Math.round(this.world.width * this.world.height * CONFIG.stars.density);
    this.stars = Array.from({ length: count }, () => this.createStar(Math.random() * this.world.height));
  }

  createStar(y) {
    const { minSpeed, maxSpeed } = CONFIG.stars;
    const depth = Math.random();
    return {
      x: Math.random() * this.world.width,
      y,
      depth,
      size: 0.6 + depth * 1.4,
      speed: minSpeed + depth * (maxSpeed - minSpeed),
      phase: Math.random() * Math.PI * 2,
    };
  }

  update() {
    for (const star of this.stars) {
      star.y += star.speed;
      star.phase += CONFIG.stars.twinkleSpeed;
      if (star.y > this.world.height) Object.assign(star, this.createStar(0));
    }
  }

  draw(ctx) {
    const { a: pixelsPerUnit } = ctx.getTransform();
    const snap = value => Math.round(value * pixelsPerUnit) / pixelsPerUnit;
    const levels = Array.from({ length: BRIGHTNESS_LEVELS }, () => []);
    for (const star of this.stars) {
      const twinkle = 0.75 + 0.25 * Math.sin(star.phase);
      const brightness = (0.3 + 0.5 * star.depth) * twinkle;
      const level = Math.min(BRIGHTNESS_LEVELS - 1, Math.floor((brightness / MAX_BRIGHTNESS) * BRIGHTNESS_LEVELS));
      levels[level].push(star);
    }

    ctx.fillStyle = '#ffffff';
    levels.forEach((stars, level) => {
      if (stars.length === 0) return;
      ctx.globalAlpha = ((level + 0.5) / BRIGHTNESS_LEVELS) * MAX_BRIGHTNESS;
      for (const star of stars) {
        const size = Math.max(1 / pixelsPerUnit, snap(star.size));
        ctx.fillRect(snap(star.x), snap(star.y), size, size);
      }
    });
    ctx.globalAlpha = 1;
  }
}
