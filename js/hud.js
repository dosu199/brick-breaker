const MAX_LIFE_ICONS = 5;
const SCORE_DIGITS = 6;

class Hud {
  constructor(root) {
    this.scoreZeros = root.querySelector('#score-zeros');
    this.scoreValue = root.querySelector('#score-value');
    this.scoreBox = root.querySelector('#score');
    this.levelName = root.querySelector('#level-name');
    this.levelTrack = root.querySelector('#level-track');
    this.lives = root.querySelector('#lives');
    this.last = {};
  }

  update({ score, level, levelCount, levelName, lives }) {
    this.updateScore(score);
    this.updateLevel(level, levelCount, levelName);
    this.updateLives(lives);
    this.last = { score, lives };
  }

  updateScore(score) {
    const digits = String(score);
    this.scoreZeros.textContent = '0'.repeat(Math.max(0, SCORE_DIGITS - digits.length));
    this.scoreValue.textContent = digits;
    if (score > (this.last.score ?? score)) this.replay(this.scoreBox, 'bump');
  }

  updateLevel(level, levelCount, levelName) {
    this.levelName.textContent = `${level + 1}/${levelCount} · ${levelName}`;

    if (this.levelTrack.children.length !== levelCount) {
      this.levelTrack.replaceChildren(...Array.from({ length: levelCount }, () => document.createElement('span')));
    }
    [...this.levelTrack.children].forEach((segment, index) => {
      segment.className = index < level ? 'cleared' : index === level ? 'current' : '';
    });
  }

  updateLives(lives) {
    const icons = Array.from({ length: Math.min(lives, MAX_LIFE_ICONS) }, () => {
      const icon = document.createElement('span');
      icon.className = 'life';
      return icon;
    });
    if (lives > MAX_LIFE_ICONS) {
      const extra = document.createElement('span');
      extra.className = 'extra';
      extra.textContent = `+${lives - MAX_LIFE_ICONS}`;
      icons.push(extra);
    }
    this.lives.replaceChildren(...icons);
    this.lives.setAttribute('aria-label', `${lives} lives`);

    if (lives < (this.last.lives ?? lives)) this.replay(this.lives, 'hit');
  }

  replay(element, className) {
    element.classList.remove(className);
    void element.offsetWidth;
    element.classList.add(className);
  }
}
