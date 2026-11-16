// Game state and the main loop logic.

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.canvas.width = CONFIG.canvas.width;
    this.canvas.height = CONFIG.canvas.height;
    this.ctx = canvas.getContext('2d');

    this.input = new Input(this.canvas);
    this.paddle = new Paddle();
    this.ball = new Ball();
    this.bricks = new Bricks();
    this.powerUps = [];

    this.score = 0;
      this.lives = CONFIG.lives;
      this.state = 'ready'; // 'ready' | 'playing' | 'won' | 'lost'
  }

  update() {
    this.paddle.update(this.input);
    this.ball.update();
    let brick = Collision.ballBricks(this.ball, this.bricks.grid);
    if (brick) {
      console.log('Brick hit:', brick);
      this.powerUps.push(new PowerUp(brick.x, brick.y));
      console.log('powerUps:', this.powerUps);
    }
    Collision.ballPaddle(this.ball, this.paddle);
    if (this.state === 'ready') {
      this.ball.reset(this.paddle);
    }
    if (this.state === 'ready' && this.input.launch) {
      this.state = 'playing';
    } 
    if (this.bricks.remaining() === 0) {
      this.state = 'won';
    }
     
    // TODO: check collisions
    // TODO: ball fell below paddle -> lose a life
    // TODO: no bricks left -> win
  }

  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    // this.paddle.draw(this.ctx);
    this.bricks.draw(this.ctx);
    this.paddle.draw(this.ctx);
    this.ball.draw(this.ctx);
    this.powerUps.forEach(p => p.move());
    this.powerUps.forEach(p => p.draw(this.ctx));
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
