// The ball: position (x, y) + velocity (dx, dy).

class Ball {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.dx = CONFIG.ball.speed;
    this.dy = -CONFIG.ball.speed;
    this.radius = CONFIG.ball.radius;
    this.color = CONFIG.ball.color;
    this.glow = CONFIG.ball.glow;
  }

  reset(paddle) {
    this.x = paddle.x + paddle.width / 2;
    this.y = paddle.y - this.radius;
    this.dx = CONFIG.ball.speed;
    this.dy = -CONFIG.ball.speed;
    // TODO: place ball on top of the paddle, stop it until launch
  }

  update() {
    this.x += this.dx;
    this.y += this.dy;
    if (this.x - this.radius < 0 || this.x + this.radius > canvas.width) {
      this.dx = -this.dx;
    }
    if (this.y - this.radius < 0) {
      this.dy = -this.dy;
    }
    if (this.y + this.radius > canvas.height) {
      // Ball fell below the bottom of the canvas
      // TODO: handle losing a life
    }
    // TODO: x += dx; y += dy;
    // TODO: bounce off left, right and top walls
  }

    draw(ctx) {
    ctx.fillStyle = this.color;

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();

  }
}
