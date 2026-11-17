class Particles {
  constructor() {
    this.sparks = [];
    this.rings = [];
  }

  clear() {
    this.sparks = [];
    this.rings = [];
  }

  burst(x, y, width, height, color, strength = 1) {
    const { count, speed, life, minSize, maxSize, sparkChance, max, ringLife, ringScale } = CONFIG.particles;

    for (let i = 0; i < Math.round(count * strength); i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (0.3 + Math.random() * 0.7);
      const particleLife = life * (0.6 + Math.random() * 0.4);
      this.sparks.push({
        x: x + Math.random() * width,
        y: y + Math.random() * height,
        dx: Math.cos(angle) * velocity,
        dy: Math.sin(angle) * velocity,
        life: particleLife,
        maxLife: particleLife,
        size: minSize + Math.random() * (maxSize - minSize),
        color: Math.random() < sparkChance ? '#ffffff' : color,
      });
    }
    if (this.sparks.length > max) this.sparks.splice(0, this.sparks.length - max);
    if (strength < 1) return;

    this.rings.push({
      x: x + width / 2,
      y: y + height / 2,
      maxRadius: Math.max(width, height) * ringScale,
      life: ringLife,
      maxLife: ringLife,
      color,
    });
  }

  update() {
    const { gravity, drag } = CONFIG.particles;

    for (const spark of this.sparks) {
      spark.dx *= drag;
      spark.dy = spark.dy * drag + gravity;
      spark.x += spark.dx;
      spark.y += spark.dy;
      spark.life--;
    }
    for (const ring of this.rings) ring.life--;

    this.sparks = this.sparks.filter(spark => spark.life > 0);
    this.rings = this.rings.filter(ring => ring.life > 0);
  }

  draw(ctx) {
    if (this.sparks.length === 0 && this.rings.length === 0) return;

    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    ctx.lineWidth = 1.5;
    for (const ring of this.rings) {
      const remaining = ring.life / ring.maxLife;
      const progress = 1 - remaining;
      ctx.globalAlpha = remaining * 0.5;
      ctx.strokeStyle = ring.color;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, ring.maxRadius * (1 - (1 - progress) ** 3), 0, Math.PI * 2);
      ctx.stroke();
    }

    for (const spark of this.sparks) {
      const remaining = spark.life / spark.maxLife;
      const size = spark.size * (0.4 + 0.6 * remaining);
      ctx.globalAlpha = Math.sqrt(remaining);
      ctx.fillStyle = spark.color;
      ctx.fillRect(spark.x - size / 2, spark.y - size / 2, size, size);
    }

    ctx.restore();
  }
}
