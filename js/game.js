// Game state and the main loop logic.

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');

    this.input = new Input();
    this.paddle = new Paddle();
    this.ball = new Ball();
    this.bricks = new Bricks();

    this.score = 0;
    this.lives = CONFIG.lives;
    this.state = 'ready'; // 'ready' | 'playing' | 'won' | 'lost'
  }

  update() {
    // TODO: update paddle and ball
    // TODO: check collisions
    // TODO: ball fell below paddle -> lose a life
    // TODO: no bricks left -> win
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // this.paddle.draw(this.ctx);
    this.bricks.draw(this.ctx);
    // TODO: draw bricks, paddle, ball
    // TODO: draw win/lose message
  }

  updateHud() {
    // TODO: write score and lives into #score and #lives
  }

  loop() {
    this.update();
    this.draw();
    requestAnimationFrame(() => this.loop());
  }

  start() {
    this.loop();
  }
}
