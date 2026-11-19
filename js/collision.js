const Collision = {
  circleRect(circle, rect) {
    const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.width));
    const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.height));
    const distX = circle.x - closestX;
    const distY = circle.y - closestY;

    const overlaps = distX * distX + distY * distY < circle.radius * circle.radius;
    return overlaps ? { distX, distY } : null;
  },

  ballPaddle(ball, paddle) {
    const hit =
      ball.dy > 0 &&
      ball.y + ball.radius >= paddle.y &&
      ball.y - ball.radius <= paddle.y + paddle.height &&
      ball.x + ball.radius >= paddle.x &&
      ball.x - ball.radius <= paddle.x + paddle.width;

    if (!hit) return false;

    const paddleCenter = paddle.x + paddle.width / 2;
    const offset = Math.max(-1, Math.min(1, (ball.x - paddleCenter) / (paddle.width / 2)));

    const angle = offset * CONFIG.ball.maxBounceAngle;
    const speed = Math.hypot(ball.dx, ball.dy);
    ball.dx = speed * Math.sin(angle);
    ball.dy = -speed * Math.cos(angle);

    ball.y = paddle.y - ball.radius;

    return true;
  },

  ballBricks(ball, grid) {
    const hits = [];

    for (const row of grid) {
      for (const brick of row) {
        if (!brick?.alive) continue;

        const overlap = this.circleRect(ball, brick);
        if (!overlap) continue;

        // a Ricochet charge adds a point of damage and lets the ball smash
        // through a brick it breaks instead of bouncing
        const charged = !ball.fireball && ball.charges > 0;
        if (charged) ball.charges--;
        const damage = brick.hit(ball.fireball ? brick.hitsLeft : ball.damage + (charged ? 1 : 0));
        hits.push({ brick, damage, destroyed: !brick.alive });

        if (ball.fireball || (charged && !brick.alive)) continue;

        if (Math.abs(overlap.distX) > Math.abs(overlap.distY)) {
          ball.dx = -ball.dx;
        } else {
          ball.dy = -ball.dy;
        }
        ball.spin = 0; // bouncing off a brick ends a curve
        return hits;
      }
    }
    return hits;
  },

  ballBarrier(ball, barrierY) {
    if (ball.dy <= 0 || ball.y + ball.radius < barrierY) return false;
    ball.y = barrierY - ball.radius;
    ball.dy = -ball.dy;
    return true;
  },

  paddlePowerUp(powerUp, paddle) {
    return this.circleRect(powerUp, paddle) !== null;
  },
};
