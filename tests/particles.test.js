const assert = require('node:assert/strict');
const test = require('node:test');
const { loadScripts } = require('./helpers');

function load() {
  return loadScripts(['config.js', 'particles.js'], ['CONFIG', 'Particles']);
}

test('a burst spawns colored sparks inside the brick and one shockwave ring', () => {
  const { CONFIG, Particles } = load();
  const particles = new Particles();

  particles.burst(100, 50, 70, 20, '#ff2e88');

  assert.equal(particles.sparks.length, CONFIG.particles.count);
  assert.ok(particles.sparks.every(s => s.x >= 100 && s.x <= 170 && s.y >= 50 && s.y <= 70));
  assert.ok(particles.sparks.every(s => s.color === '#ff2e88' || s.color === '#ffffff'));
  assert.equal(particles.rings.length, 1);
  assert.deepEqual([particles.rings[0].x, particles.rings[0].y], [135, 60]);
});

test('sparks fly, fall under gravity and disappear when their life runs out', () => {
  const { CONFIG, Particles } = load();
  const particles = new Particles();
  particles.burst(0, 0, 10, 10, 'red');
  const spark = particles.sparks[0];
  Object.assign(spark, { x: 0, y: 0, dx: 2, dy: 0, life: 3, maxLife: 3 });

  particles.update();

  assert.ok(spark.x > 0, 'moves along its velocity');
  assert.ok(spark.dy > 0, 'gravity pulls it down');

  for (let i = 0; i < Math.ceil(CONFIG.particles.life) + 1; i++) particles.update();
  assert.equal(particles.sparks.length, 0);
  assert.equal(particles.rings.length, 0);
});

test('the number of sparks is capped so big fireball chains stay smooth', () => {
  const { CONFIG, Particles } = load();
  const particles = new Particles();

  for (let i = 0; i < 100; i++) particles.burst(0, 0, 10, 10, 'red');

  assert.equal(particles.sparks.length, CONFIG.particles.max);
});
