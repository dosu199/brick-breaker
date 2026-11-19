const STEP_MS = 1000 / 60;
const MAX_FRAME_MS = 250;
const UI_FONT = 'system-ui, "Segoe UI", sans-serif';

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

  // The world is always CONFIG.view (800x960, portrait). The canvas becomes the
  // largest box of that aspect ratio that fits in the given space, which
  // main.js works out from the window minus the side panels.
  resize(availableWidth = this.canvas.clientWidth, availableHeight = this.canvas.clientHeight) {
    const pixelRatio = globalThis.devicePixelRatio ?? 1;
    const { width, height } = CONFIG.view;

    const cssWidth = Math.max(1, Math.floor(Math.min(availableWidth, availableHeight * width / height)));
    const cssHeight = cssWidth * height / width;
    if (this.canvas.style) {
      this.canvas.style.width = `${cssWidth}px`;
      this.canvas.style.height = `${cssHeight}px`;
    }

    this.viewScale = cssWidth / width;
    this.world.width = width;
    this.world.height = height;
    this.canvas.width = Math.round(cssWidth * pixelRatio);
    this.canvas.height = Math.round(cssHeight * pixelRatio);
    this.scale = this.viewScale * pixelRatio;

    this.bricks?.layout();
    this.starfield?.resize();
  }

  reset() {
    this.paddle = new Paddle(this.world);
    this.score = 0;
    this.lives = CONFIG.lives;
    this.relics = new Relics();
    this.now = 0;
    this.bestCombo = 0;
    this.splitProgress = 0;
    this.startLevel(0);
  }

  // the first ball; with Splitter there can be more in `balls`
  get ball() {
    return this.balls[0];
  }

  newBall() {
    const ball = new Ball(this.world);
    ball.speed = this.ballSpeed;
    return ball;
  }

  startLevel(level) {
    const { maps, speedIncrease } = CONFIG.levels;
    this.level = level;
    this.bricks = new Bricks(this.world, maps[level].rows);
    this.ballSpeed = CONFIG.ball.speed * (1 + speedIncrease * level) * (1 - this.relics.bonus('steady'));
    this.balls = [this.newBall()];
    this.combo = 0;
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
    this.now = now;
    const launch = this.input.consumeLaunch();
    this.starfield.update();
    this.particles.update();

    if (this.isOver()) {
      if (launch) this.reset();
      return;
    }

    if (this.state === 'upgrade') {
      this.paddle.update(this.input);
      this.updateUpgrade(now, launch);
      return;
    }

    this.applyEffects(now);
    this.paddle.update(this.input);

    if (this.state === 'ready') {
      this.ball.reset(this.paddle);
      if (launch) this.launch(now);
      return;
    }

    this.moveBalls();
    this.updatePowerUps(now);

    if (this.balls.length === 0) {
      this.loseLife();
    } else if (this.bricks.remaining() === 0) {
      if (this.isLastLevel()) {
        this.state = 'won';
      } else {
        this.showUpgrades(now);
      }
    }
  }

  launch(now) {
    this.state = 'playing';
    const barrierMs = this.relics.bonus('safetyNet');
    if (barrierMs > 0) {
      this.effectsUntil.barrier = Math.max(this.effectsUntil.barrier ?? 0, now + barrierMs);
      this.applyEffects(now);
    }
  }

  showUpgrades(now) {
    this.offers = this.relics.offer();
    this.upgradeShownAt = now;
    this.powerUps = [];
    this.state = 'upgrade';
  }

  updateUpgrade(now, launch) {
    const choice = this.input.consumeChoice();
    // ignore input for a moment so a click meant for the ball doesn't pick a card
    if (now - this.upgradeShownAt < CONFIG.relics.pickDelayMs) return;

    if (choice !== null && choice < this.offers.length) {
      this.pickRelic(choice);
    } else if (launch) {
      this.pickRelic(this.hoveredCard());
    }
  }

  pickRelic(index) {
    const relic = this.offers[index];
    this.relics.add(relic.id);
    if (relic.id === 'spareHeart') this.gainLives(relic.value);
    if (relic.id === 'glassCannon') this.lives = 1;
    this.startLevel(this.level + 1);
  }

  // Glass Cannon caps lives at 1
  gainLives(count) {
    const max = this.relics.has('glassCannon') ? 1 : Infinity;
    this.lives = Math.max(this.lives, Math.min(max, this.lives + count));
    this.updateHud();
  }

  cardLayout() {
    const { width, height, gap, sideMargin } = CONFIG.relics.card;
    const count = this.offers.length;
    const neededWidth = count * width + (count - 1) * gap;
    const scale = Math.min(1, (this.world.width - 2 * sideMargin) / neededWidth, (this.world.height * 0.6) / height);
    const left = (this.world.width - neededWidth * scale) / 2;
    const top = (this.world.height - height * scale) / 2 + 30 * scale;

    return {
      scale,
      cards: this.offers.map((relic, i) => ({
        relic,
        x: left + i * (width + gap) * scale,
        y: top,
        width: width * scale,
        height: height * scale,
      })),
    };
  }

  // the card closest to the paddle is the one a click picks
  hoveredCard() {
    let best = 0;
    let bestDistance = Infinity;
    this.cardLayout().cards.forEach((card, i) => {
      const distance = Math.abs(card.x + card.width / 2 - this.input.mouseX);
      if (distance < bestDistance) {
        best = i;
        bestDistance = distance;
      }
    });
    return best;
  }

  moveBalls() {
    // a copy, so balls split off this frame start moving next frame
    for (const ball of [...this.balls]) this.moveBall(ball);
    this.balls = this.balls.filter(ball => !ball.isBelowScreen());
  }

  moveBall(ball) {
    ball.recordTrail();
    const steps = Math.max(1, Math.ceil(ball.distancePerTick() / ball.radius));
    for (let i = 0; i < steps; i++) {
      ball.update(1 / steps);
      if (Collision.ballPaddle(ball, this.paddle)) {
        ball.spinFromPaddle(this.paddle);
        this.combo = 0;
      }
      if (this.barrierRemaining > 0 && Collision.ballBarrier(ball, this.barrierY())) {
        this.particles.burst(ball.x - 6, this.barrierY() - 2, 12, 2, CONFIG.barrier.color, 0.4);
      }
      this.handleBrickHits(Collision.ballBricks(ball, this.bricks.grid), ball);
      if (ball.isBelowScreen()) return;
    }
  }

  comboMultiplier(combo = this.combo) {
    const { hitsPerStep, stepBonus, maxMultiplier } = CONFIG.combo;
    return Math.min(maxMultiplier, 1 + Math.floor(combo / hitsPerStep) * stepBonus);
  }

  addCombo() {
    const before = this.comboMultiplier();
    this.combo++;
    this.bestCombo = Math.max(this.bestCombo, this.combo);
    if (this.comboMultiplier() > before) this.comboPopAt = this.now;
  }

  // Splitter: every `splitEvery / stacks` broken bricks, the ball splits
  splitBall(ball) {
    const stacks = this.relics.stacks('splitter');
    if (stacks === 0 || !ball) return;
    const { splitEvery, splitAngle, maxBalls } = CONFIG.relics;
    this.splitProgress++;
    if (this.splitProgress < Math.ceil(splitEvery / stacks)) return;
    this.splitProgress = 0;
    if (this.balls.length < maxBalls) this.balls.push(ball.split(splitAngle));
  }

  // Volatile: a broken brick blasts every brick around it for 1 damage.
  // Returns those hits so they can explode in turn.
  explode(brick) {
    this.particles.burst(brick.x - brick.width / 2, brick.y - brick.height, brick.width * 2, brick.height * 3, CONFIG.relics.explosionColor, 1.5);
    return this.bricks.neighbors(brick).map(other => {
      const damage = other.hit(1);
      return { brick: other, damage, destroyed: !other.alive };
    });
  }

  barrierY() {
    return this.world.height - CONFIG.barrier.offset;
  }

  handleBrickHits(hits, ball = this.ball) {
    if (hits.length === 0) return;

    const glass = this.relics.has('glassCannon') ? 2 : 1;
    const pointsPerHit = CONFIG.bricks.points * (1 + this.relics.bonus('greed')) * glass;
    const echo = this.relics.has('echo') ? 0.5 : 1;
    const dropChance = (CONFIG.powerUps.dropChance + this.relics.bonus('lucky')) * echo;
    const explodeChance = this.relics.bonus('volatile');

    const queue = [...hits];
    while (queue.length > 0) {
      const { brick, damage, destroyed } = queue.shift();
      this.addCombo();
      this.score += Math.round(pointsPerHit * damage * this.comboMultiplier());
      if (!destroyed) {
        this.particles.burst(brick.x, brick.y, brick.width, brick.height, brick.color, 0.35);
        continue;
      }
      this.particles.burst(brick.x, brick.y, brick.width, brick.height, brick.color);
      if (Math.random() < dropChance) {
        this.powerUps.push(new PowerUp(brick.x + brick.width / 2, brick.y + brick.height / 2, this.world));
      }
      this.splitBall(ball);
      if (explodeChance > 0 && Math.random() < explodeChance) queue.push(...this.explode(brick));
    }
    this.updateHud();
  }

  updatePowerUps(now) {
    const { magnetPull, magnetMaxSpeed } = CONFIG.effects;
    const paddleCenter = this.paddle.x + this.paddle.width / 2;

    for (const powerUp of this.powerUps) {
      powerUp.update();
      if (this.magnetActive) {
        const pull = (paddleCenter - powerUp.x) * magnetPull;
        powerUp.x += Math.max(-magnetMaxSpeed, Math.min(magnetMaxSpeed, pull));
      }
      if (Collision.paddlePowerUp(powerUp, this.paddle)) {
        powerUp.alive = false;
        this.collectPowerUp(powerUp.type, now);
      }
    }
    this.powerUps = this.powerUps.filter(p => p.alive && !p.isBelowScreen());
  }

  collectPowerUp(type, now) {
    const echo = this.relics.has('echo') ? 2 : 1;
    if (type === 'extraLife') {
      this.gainLives(echo);
    } else {
      const { durationMs = CONFIG.effects.durationMs } = CONFIG.powerUps.types.find(t => t.type === type) ?? {};
      this.effectsUntil[type] = now + durationMs * (1 + this.relics.bonus('longFuse')) * echo;
    }
  }

  applyEffects(now) {
    const active = type => now < (this.effectsUntil[type] ?? 0);
    const { expandScale, shrinkScale, fastScale, slowScale } = CONFIG.effects;

    const wide = 1 + this.relics.bonus('wide');
    this.paddle.setScale(wide * (active('expand') ? expandScale : 1) * (active('shrink') ? shrinkScale : 1));
    const speedScale = (active('fast') ? fastScale : 1) * (active('slow') ? slowScale : 1);
    const damage = (1 + this.relics.bonus('heavy')) * (this.relics.has('glassCannon') ? 2 : 1);
    const maxCharges = this.relics.bonus('ricochet');
    for (const ball of this.balls) {
      ball.speedScale = speedScale;
      ball.fireball = active('fireball');
      ball.damage = damage;
      ball.maxCharges = maxCharges;
    }
    this.paddle.reversed = active('reverse');
    this.magnetActive = active('magnet');
    this.barrierRemaining = Math.max(0, (this.effectsUntil.barrier ?? 0) - now);
  }

  loseLife() {
    this.lives--;
    this.balls = [this.newBall()];
    this.combo = 0;
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
    this.drawBarrier();
    this.paddle.draw(this.ctx);
    this.balls.forEach(ball => ball.draw(this.ctx));

    if (this.state === 'upgrade') {
      this.drawUpgrades();
      return;
    }
    if (this.state === 'playing') this.drawCombo();
    const message = this.currentMessage();
    if (message) this.drawMessage(message);
  }

  // the multiplier sits under the bricks and pops when it goes up
  drawCombo() {
    const multiplier = this.comboMultiplier();
    if (multiplier <= 1) return;

    const ctx = this.ctx;
    const { popMs, color } = CONFIG.combo;
    const pop = Math.max(0, 1 - (this.now - (this.comboPopAt ?? -Infinity)) / popMs);
    const centerX = this.world.width / 2;
    const y = this.world.height * 0.68;

    ctx.save();
    ctx.globalAlpha = 0.8;
    ctx.textAlign = 'center';
    withGlow(ctx, color, 16 + 20 * pop, () => {
      ctx.fillStyle = color;
      ctx.font = `800 ${Math.round(34 * (1 + 0.4 * pop))}px ${UI_FONT}`;
      ctx.fillText(`×${multiplier}`, centerX, y);
    });
    ctx.fillStyle = '#94a3b8';
    ctx.font = `600 13px ${UI_FONT}`;
    ctx.fillText(`${this.combo} HIT COMBO`, centerX, y + 22);
    ctx.restore();
  }

  drawUpgrades() {
    const ctx = this.ctx;
    const { scale, cards } = this.cardLayout();
    const hovered = this.hoveredCard();
    const centerX = this.world.width / 2;
    const titleY = cards[0].y - 62 * scale;

    ctx.fillStyle = 'rgba(2, 3, 10, 0.7)';
    ctx.fillRect(0, 0, this.world.width, this.world.height);

    ctx.textAlign = 'center';
    withGlow(ctx, '#00e0b8', 20, () => {
      ctx.fillStyle = '#f8fafc';
      ctx.font = `700 ${Math.round(40 * scale)}px ${UI_FONT}`;
      ctx.fillText(`LEVEL ${this.level + 1} CLEAR`, centerX, titleY);
    });
    ctx.fillStyle = '#94a3b8';
    ctx.font = `500 ${Math.round(16 * scale)}px ${UI_FONT}`;
    ctx.fillText(`Choose an upgrade for this run · click or press 1–${cards.length}`, centerX, titleY + 30 * scale);

    cards.forEach((card, i) => this.drawCard(card, i, i === hovered, scale));
  }

  drawCard({ relic, x, y, width, height }, index, hovered, scale) {
    const ctx = this.ctx;
    const top = hovered ? y - 10 * scale : y;
    const centerX = x + width / 2;
    const px = size => `${Math.round(size * scale)}px ${UI_FONT}`;
    const tracePanel = () => {
      ctx.beginPath();
      ctx.roundRect(x, top, width, height, 16 * scale);
    };

    withGlow(ctx, relic.color, hovered ? 24 : 0, () => {
      ctx.fillStyle = hovered ? 'rgba(30, 41, 59, 0.97)' : 'rgba(15, 23, 42, 0.92)';
      tracePanel();
      ctx.fill();
    });
    ctx.save();
    ctx.globalAlpha = hovered ? 1 : 0.45;
    ctx.strokeStyle = relic.color;
    ctx.lineWidth = hovered ? 2.5 : 1.5;
    tracePanel();
    ctx.stroke();
    ctx.restore();

    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = `600 ${px(14)}`;
    ctx.fillText(String(index + 1), x + 14 * scale, top + 24 * scale);

    const rarity = relic.rarity ?? 'common';
    ctx.textAlign = 'right';
    ctx.fillStyle = CONFIG.relics.rarity[rarity].color;
    ctx.font = `700 ${px(11)}`;
    ctx.fillText(rarity.toUpperCase(), x + width - 14 * scale, top + 24 * scale);

    const gemY = top + 62 * scale;
    const gem = 22 * scale;
    withGlow(ctx, relic.color, 16, () => {
      ctx.fillStyle = relic.color;
      ctx.beginPath();
      ctx.moveTo(centerX, gemY - gem);
      ctx.lineTo(centerX + gem, gemY);
      ctx.lineTo(centerX, gemY + gem);
      ctx.lineTo(centerX - gem, gemY);
      ctx.fill();
    });

    ctx.textAlign = 'center';
    ctx.fillStyle = '#f8fafc';
    ctx.font = `700 ${px(21)}`;
    ctx.fillText(relic.name, centerX, top + 124 * scale);

    ctx.fillStyle = '#94a3b8';
    ctx.font = `500 ${px(15)}`;
    this.wrapText(relic.description, width - 36 * scale).forEach((line, i) => {
      ctx.fillText(line, centerX, top + (156 + i * 21) * scale);
    });

    const owned = this.relics.stacks(relic.id);
    let footer = owned > 0 ? `Owned ${owned} / ${relic.maxStacks}` : 'New';
    if (relic.maxStacks === Infinity) footer = 'Instant';
    ctx.fillStyle = relic.color;
    ctx.font = `600 ${px(13)}`;
    ctx.fillText(footer.toUpperCase(), centerX, top + height - 22 * scale);
  }

  wrapText(text, maxWidth) {
    const lines = [];
    let line = '';
    for (const word of text.split(' ')) {
      const candidate = line ? `${line} ${word}` : word;
      if (line && this.ctx.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
    return lines;
  }

  drawBarrier() {
    const { color, blinkMs } = CONFIG.barrier;
    if (!(this.barrierRemaining > 0) || (this.state !== 'playing' && this.state !== 'ready')) return;
    if (this.barrierRemaining < blinkMs && Math.floor(this.barrierRemaining / 150) % 2 === 0) return;

    const y = this.barrierY();
    this.ctx.save();
    this.ctx.globalCompositeOperation = 'lighter';
    this.ctx.strokeStyle = color;
    for (const [lineWidth, alpha] of [[10, 0.12], [5, 0.25], [1.5, 1]]) {
      this.ctx.globalAlpha = alpha;
      this.ctx.lineWidth = lineWidth;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(this.world.width, y);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  currentMessage() {
    const subtitle = `Best combo ${this.bestCombo} · Click to play again`;
    switch (this.state) {
      case 'won':
        return { title: 'MISSION COMPLETE', subtitle, glow: '#22d3ee' };
      case 'lost':
        return { title: 'GAME OVER', subtitle, glow: '#ff2e88' };
      default:
        return null;
    }
  }

  drawMessage({ title, subtitle, glow }) {
    const centerX = this.world.width / 2;
    const centerY = this.world.height / 2;
    const font = UI_FONT;

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
      relics: this.relics.list(),
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
