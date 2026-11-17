const STEP_MS = 1000 / 60;
const MAX_FRAME_MS = 250;

class Game {
  constructor(canvas, hud) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.hud = hud;

    this.world = { width: 0, height: 0 };
    this.resize();
    this.starfield = new Starfield(this.world);
    this.particles = new Particles();

    this.input = new Input(this.canvas, this.world);
    this.reset();
  }

  resize() {
    const pixelRatio = globalThis.devicePixelRatio ?? 1;
    const cssWidth = this.canvas.clientWidth;
    const cssHeight = this.canvas.clientHeight;
    const { width, height, minScale, maxScale } = CONFIG.view;

    this.viewScale = Math.max(minScale, Math.min(maxScale, cssWidth / width, cssHeight / height));
    this.world.width = cssWidth / this.viewScale;
    this.world.height = cssHeight / this.viewScale;
    this.canvas.width = Math.round(cssWidth * pixelRatio);
    this.canvas.height = Math.round(cssHeight * pixelRatio);
    this.scale = this.viewScale * pixelRatio;

    this.bricks?.layout();
    this.starfield?.resize();
  }

  reset() {
    this.paddle = new Paddle(this.world);
    this.ball = new Ball(this.world);
    this.score = 0;
    this.lives = CONFIG.lives;
    this.startLevel(0);
  }

  startLevel(level) {
    const { maps, speedIncrease } = CONFIG.levels;
    this.level = level;
    this.bricks = new Bricks(this.world, maps[level].rows);
    this.ball.speed = CONFIG.ball.speed * (1 + speedIncrease * level);
    this.powerUps = [];
    this.effectsUntil = {};
    this.particles.clear();
    this.state = 'ready';
    this.updateHud();
  }

  isLastLevel() {
    return this.level === CONFIG.levels.maps.length - 1;
  }

  isOver() {
    return this.state === 'won' || this.state === 'lost';
  }

  update(now) {
    const launch = this.input.consumeLaunch();
    this.starfield.update();
    this.particles.update();

    if (this.isOver()) {
      if (launch) this.reset();
      return;
    }

    if (this.state === 'levelComplete') {
      if (launch) this.startLevel(this.level + 1);
      return;
    }

    this.applyEffects(now);
    this.paddle.update(this.input);

    if (this.state === 'ready') {
      this.ball.reset(this.paddle);
      if (launch) this.state = 'playing';
      return;
    }

    this.moveBall();
    this.updatePowerUps(now);

    if (this.ball.isBelowScreen()) {
      this.loseLife();
    } else if (this.bricks.remaining() === 0) {
      this.state = this.isLastLevel() ? 'won' : 'levelComplete';
    }
  }

  moveBall() {
    const steps = Math.max(1, Math.ceil(this.ball.distancePerTick() / this.ball.radius));
    for (let i = 0; i < steps; i++) {
      this.ball.update(1 / steps);
      Collision.ballPaddle(this.ball, this.paddle);
      this.handleBrickHits(Collision.ballBricks(this.ball, this.bricks.grid));
      if (this.ball.isBelowScreen()) return;
    }
  }

  handleBrickHits(bricks) {
    if (bricks.length === 0) return;

    for (const brick of bricks) {
      this.score += CONFIG.bricks.points;
      this.particles.burst(brick.x, brick.y, brick.width, brick.height, brick.color);
      if (Math.random() < CONFIG.powerUps.dropChance) {
        this.powerUps.push(new PowerUp(brick.x + brick.width / 2, brick.y + brick.height / 2, this.world));
      }
    }
    this.updateHud();
  }

  updatePowerUps(now) {
    for (const powerUp of this.powerUps) {
      powerUp.update();
      if (Collision.paddlePowerUp(powerUp, this.paddle)) {
        powerUp.alive = false;
        this.collectPowerUp(powerUp.type, now);
      }
    }
    this.powerUps = this.powerUps.filter(p => p.alive && !p.isBelowScreen());
  }

  collectPowerUp(type, now) {
    if (type === 'extraLife') {
      this.lives++;
      this.updateHud();
    } else {
      this.effectsUntil[type] = now + CONFIG.effects.durationMs;
    }
  }

  applyEffects(now) {
    const active = type => now < (this.effectsUntil[type] ?? 0);
    const { expandScale, shrinkScale, fastScale, slowScale } = CONFIG.effects;

    this.paddle.setScale((active('expand') ? expandScale : 1) * (active('shrink') ? shrinkScale : 1));
    this.ball.speedScale = (active('fast') ? fastScale : 1) * (active('slow') ? slowScale : 1);
    this.ball.fireball = active('fireball');
  }

  loseLife() {
    this.lives--;
    this.powerUps = [];
    this.effectsUntil = {};
    this.state = this.lives > 0 ? 'ready' : 'lost';
    this.updateHud();
  }

  draw() {
    this.ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    this.ctx.clearRect(0, 0, this.world.width, this.world.height);
    this.starfield.draw(this.ctx);
    this.bricks.draw(this.ctx);
    this.particles.draw(this.ctx);
    this.powerUps.forEach(p => p.draw(this.ctx));
    this.paddle.draw(this.ctx);
    this.ball.draw(this.ctx);

    const message = this.currentMessage();
    if (message) this.drawMessage(message);
  }

  currentMessage() {
    switch (this.state) {
      case 'won':
        return { title: 'MISSION COMPLETE', subtitle: 'Click to play again', glow: '#22d3ee' };
      case 'lost':
        return { title: 'GAME OVER', subtitle: 'Click to play again', glow: '#ff2e88' };
      case 'levelComplete': {
        const next = CONFIG.levels.maps[this.level + 1];
        return {
          title: `LEVEL ${this.level + 1} CLEAR`,
          subtitle: `Click for level ${this.level + 2}: ${next.name}`,
          glow: '#00e0b8',
        };
      }
      default:
        return null;
    }
  }

  drawMessage({ title, subtitle, glow }) {
    const centerX = this.world.width / 2;
    const centerY = this.world.height / 2;
    const font = 'system-ui, "Segoe UI", sans-serif';

    this.ctx.fillStyle = 'rgba(2, 3, 10, 0.55)';
    this.ctx.fillRect(0, 0, this.world.width, this.world.height);

    this.ctx.textAlign = 'center';
    withGlow(this.ctx, glow, 20, () => {
      this.ctx.fillStyle = '#f8fafc';
      this.ctx.font = `700 44px ${font}`;
      this.ctx.fillText(title, centerX, centerY);
    });
    this.ctx.fillStyle = '#94a3b8';
    this.ctx.font = `500 16px ${font}`;
    this.ctx.fillText(subtitle, centerX, centerY + 38);
  }

  updateHud() {
    const { maps } = CONFIG.levels;
    this.hud.update({
      score: this.score,
      level: this.level,
      levelCount: maps.length,
      levelName: maps[this.level].name,
      lives: this.lives,
    });
  }

  loop(now) {
    this.lag += Math.min(now - this.lastTime, MAX_FRAME_MS);
    this.lastTime = now;

    while (this.lag >= STEP_MS) {
      this.update(now);
      this.lag -= STEP_MS;
    }
    this.draw();

    requestAnimationFrame(t => this.loop(t));
  }

  start() {
    requestAnimationFrame(now => {
      this.lastTime = now;
      this.lag = 0;
      this.loop(now);
    });
  }
}
