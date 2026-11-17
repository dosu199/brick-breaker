const assert = require('node:assert/strict');
const test = require('node:test');
const { loadScripts } = require('./helpers');

function fakeElement() {
  const classes = new Set();
  return {
    textContent: '',
    className: '',
    children: [],
    attributes: {},
    offsetWidth: 0,
    replaceChildren(...children) {
      this.children = children;
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    classList: {
      add(name) { classes.add(name); },
      remove(name) { classes.delete(name); },
      contains(name) { return classes.has(name); },
    },
  };
}

function createHud() {
  const elements = {};
  const root = {
    querySelector(selector) {
      elements[selector] ??= fakeElement();
      return elements[selector];
    },
  };
  const { Hud } = loadScripts(['hud.js'], ['Hud'], {
    document: { createElement: () => fakeElement() },
  });
  return { hud: new Hud(root), el: id => elements[`#${id}`] };
}

const STATE = { score: 0, level: 0, levelCount: 5, levelName: 'Wall', lives: 3 };

test('the score is padded to six digits with separate leading zeros', () => {
  const { hud, el } = createHud();

  hud.update({ ...STATE, score: 340 });

  assert.equal(el('score-zeros').textContent, '000');
  assert.equal(el('score-value').textContent, '340');
});

test('the level track marks cleared, current and upcoming levels', () => {
  const { hud, el } = createHud();

  hud.update({ ...STATE, level: 2, levelName: 'Diamond' });

  assert.equal(el('level-name').textContent, '3/5 · Diamond');
  assert.deepEqual(el('level-track').children.map(s => s.className), ['cleared', 'cleared', 'current', '', '']);
});

test('lives show one heart each, capped with a +n counter', () => {
  const { hud, el } = createHud();

  hud.update({ ...STATE, lives: 3 });
  assert.deepEqual(el('lives').children.map(c => c.className), ['life', 'life', 'life']);

  hud.update({ ...STATE, lives: 7 });
  const icons = el('lives').children;
  assert.equal(icons.filter(c => c.className === 'life').length, 5);
  assert.equal(icons.at(-1).textContent, '+2');
  assert.equal(el('lives').attributes['aria-label'], '7 lives');
});

test('the score bumps when it goes up and the lives shake when one is lost', () => {
  const { hud, el } = createHud();
  hud.update(STATE);
  assert.equal(el('score').classList.contains('bump'), false, 'no animation on the first update');

  hud.update({ ...STATE, score: 10 });
  assert.equal(el('score').classList.contains('bump'), true);

  hud.update({ ...STATE, score: 10, lives: 2 });
  assert.equal(el('lives').classList.contains('hit'), true);
});
