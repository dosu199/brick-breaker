// The player-controlled paddle.

class Paddle {
  constructor() {
    this.width = CONFIG.paddle.width;
    this.height = CONFIG.paddle.height;
    this.x = 400 - this.width / 2;
    this.y = 500;
    this.speed = CONFIG.paddle.speed;
    this.color = CONFIG.paddle.color;
  }

  update(input) {
    // TODO: move left/right based on input
    // TODO: keep paddle inside the canvas
  }

  draw(ctx) {
    ctx.fillStyle = this.color;
    ctx.fillRect(this.x, this.y, this.width, this.height);
    // TODO: draw a rectangle
  }
}
