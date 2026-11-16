// The player-controlled paddle.

class Paddle {
  constructor() {
    this.width = CONFIG.paddle.width;
    this.height = CONFIG.paddle.height;
    this.x = 700 - this.width / 2;
    this.y = 750;
    this.speed = CONFIG.paddle.speed;
    this.color = CONFIG.paddle.color;
  }

    update(input) {
    this.x = input.mouseX - this.width / 2;

    if (this.x < 0) this.x = 0;
    if (this.x + this.width > canvas.width) this.x = canvas.width - this.width;
  }

    draw(ctx) {
    ctx.fillStyle = CONFIG.paddle.color;
    ctx.beginPath();
    ctx.roundRect(this.x, this.y, this.width, this.height, this.height / 2);
    ctx.fill();
  }
}
