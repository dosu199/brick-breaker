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

        brick.alive = false;
        hits.push(brick);

        if (ball.fireball) continue;

        if (Math.abs(overlap.distX) > Math.abs(overlap.distY)) {
          ball.dx = -ball.dx;
        } else {
          ball.dy = -ball.dy;
        }
        return hits;
      }
    }
    return hits;
  },

  paddlePowerUp(powerUp, paddle) {
    return this.circleRect(powerUp, paddle) !== null;
  },
};
