// Collision helpers.

const Collision = {
  // Does a circle (ball) overlap a rectangle (brick/paddle)?
  circleRect(ball, rect) {
    // TODO: return true/false
  },

    ballPaddle(ball, paddle) {
    const hit =
      ball.dy > 0 &&
      ball.y + ball.radius >= paddle.y &&
      ball.y - ball.radius <= paddle.y + paddle.height &&
      ball.x + ball.radius >= paddle.x &&
      ball.x - ball.radius <= paddle.x + paddle.width;

    if (!hit) return false;

    // Where on the paddle did it hit? -1 = left edge, 0 = center, 1 = right edge
    const paddleCenter = paddle.x + paddle.width / 2;
    let offset = (ball.x - paddleCenter) / (paddle.width / 2);
    offset = Math.max(-1, Math.min(1, offset));

    const maxAngle = Math.PI / 3;  // 60°
    const angle = offset * maxAngle;
    const speed = Math.hypot(ball.dx, ball.dy);

    ball.dx = speed * Math.sin(angle);
    ball.dy = -speed * Math.cos(angle);

    // Push the ball above the paddle so it can't stay inside it
    ball.y = paddle.y - ball.radius;

    return true;
  },

   ballBricks(ball, grid) {
    for (let i = 0; i < grid.length; i++) {
      for (let j = 0; j < grid[i].length; j++) {
        const brick = grid[i][j];
        if (!brick.alive) continue;

        // closest point on the brick to the ball's center
        const closestX = Math.max(brick.x, Math.min(ball.x, brick.x + brick.width));
        const closestY = Math.max(brick.y, Math.min(ball.y, brick.y + brick.height));

        const distX = ball.x - closestX;
        const distY = ball.y - closestY;

        if (distX * distX + distY * distY < ball.radius * ball.radius) {
          brick.alive = false;

          // Hit the side or the top/bottom?
          if (Math.abs(distX) > Math.abs(distY)) {
            ball.dx = -ball.dx;
          } else {
            ball.dy = -ball.dy;
          }

          return brick;   // hand back the brick so the game can score it / drop a power-up
        }
      }
    }
    return null;   // no hit this frame
  },
};
