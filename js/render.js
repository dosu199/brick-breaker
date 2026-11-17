function withGlow(ctx, color, blur, draw) {
  const { a, b } = ctx.getTransform();
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur * Math.hypot(a, b);
  draw();
  ctx.restore();
}

const SpriteCache = {
  MAX_SPRITES: 200,
  sprites: new Map(),

  get(key, width, height, pad, scale, paint) {
    const fullKey = `${key}|${width}|${height}|${scale}`;
    let sprite = this.sprites.get(fullKey);
    if (!sprite) {
      if (this.sprites.size >= this.MAX_SPRITES) this.sprites.clear();
      sprite = new OffscreenCanvas(
        Math.ceil((width + 2 * pad) * scale),
        Math.ceil((height + 2 * pad) * scale)
      );
      const spriteCtx = sprite.getContext('2d');
      spriteCtx.setTransform(scale, 0, 0, scale, pad * scale, pad * scale);
      paint(spriteCtx, 0, 0);
      this.sprites.set(fullKey, sprite);
    }
    return sprite;
  },
};

function drawCached(ctx, key, x, y, width, height, pad, paint) {
  if (typeof OffscreenCanvas === 'undefined') {
    paint(ctx, x, y);
    return;
  }
  const { a, b } = ctx.getTransform();
  const sprite = SpriteCache.get(key, width, height, pad, Math.hypot(a, b), paint);
  ctx.drawImage(sprite, x - pad, y - pad, width + 2 * pad, height + 2 * pad);
}
