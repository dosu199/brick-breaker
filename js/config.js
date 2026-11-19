const CONFIG = {
  // The play field, in game units. Portrait like the arcade classics, so
  // there's a long drop between the bricks and the paddle.
  view: {
    width: 800,
    height: 960,
  },

  stars: {
    density: 0.0004,
    minSpeed: 0.04,
    maxSpeed: 0.35,
    twinkleSpeed: 0.03,
  },

  paddle: {
    width: 100,
    height: 12,
    bottomMargin: 10,
    color: '#6366f1',
    glowColor: '#22d3ee',
    reversedGlowColor: '#ef4444',
    glowBlur: 12,
    image: 'img/paddle.svg',
  },

  ball: {
    radius: 8,
    speed: 7.5,
    maxBounceAngle: Math.PI / 3,
    color: '#a5f3fc',
    fireballColor: '#fb923c',
    glowColor: '#22d3ee',
    fireballGlowColor: '#f97316',
    chargeColor: '#fde047',
    glowBlur: 14,
    image: 'img/ball.svg',
    fireballImage: 'img/ball-fire.svg',
    fireballSpriteScale: 3,
  },

  // Flicking the paddle as the ball hits it curves the ball. A flick is any
  // paddle movement of at least `flickSpeed` per tick; it always curves the
  // ball by the same total `curveAngle`, spread evenly over `curveTicks`, in
  // the direction of the flick. No flick, no curve.
  spin: {
    flickSpeed: 6, // world units per tick
    curveAngle: 35 * Math.PI / 180, // N: the total turn of a curved shot
    curveTicks: 40, // how long the turn takes
    paddleSmoothing: 0.5, // how much of the previous paddle speed carries over
    minVerticalRatio: 0.3, // a curving ball always keeps this much of its speed vertical
    trailLength: 10,
    trailColor: '#e879f9',
  },

  bricks: {
    height: 20,
    maxWidth: 110,
    gapRatio: 0.1,
    // empty space kept between the lowest brick row and the top of the paddle;
    // maps with many rows get thinner bricks rather than eating into it
    minPaddleGap: 560,
    padding: 7,
    offsetTop: 50, // room above the bricks for the ball to get in behind them
    sideMargin: 20,
    points: 10,
    colors: ['#ff2e88', '#b14bff', '#5b6cff', '#00c2ff', '#00e0b8'],
    image: 'img/brick.svg',
    glowBlur: 10,
    armorColor: '#cbd5e1',
    armorImage: 'img/brick-armor.svg',
    crackImages: ['img/brick-crack-1.svg', 'img/brick-crack-2.svg'],
  },

  barrier: {
    offset: 4,
    color: '#2dd4bf',
    blinkMs: 2000,
  },

  lives: 3,

  particles: {
    count: 24,
    speed: 4.2,
    gravity: 0.14,
    drag: 0.96,
    life: 48,
    minSize: 2,
    maxSize: 4.5,
    sparkChance: 0.25,
    max: 600,
    ringLife: 14,
    ringScale: 0.55,
  },

  levels: {
    speedIncrease: 0.08,
    maps: [
      {
        name: 'Wall',
        rows: [
          '############',
          '############',
          '############',
          '############',
          '############',
        ],
      },
      {
        name: 'Pyramid',
        rows: [
          '.......33.......',
          '......3333......',
          '.....######.....',
          '....########....',
          '...##########...',
          '..############..',
          '.##############.',
          '################',
        ],
      },
      {
        name: 'Diamond',
        rows: [
          '.......3333.......',
          '......######......',
          '.....########.....',
          '....##########....',
          '..#####3..3#####..',
          '....##########....',
          '.....########.....',
          '......######......',
          '.......3333.......',
        ],
      },
      {
        name: 'Checker',
        rows: [
          '##..##..##..##..##',
          '##..##..##..##..##',
          '..##..33..##..33..',
          '..##..33..##..33..',
          '##..##..##..##..##',
          '##..##..##..##..##',
          '..##..##..##..##..',
          '..##..##..##..##..',
        ],
      },
      {
        name: 'Invader',
        rows: [
          '33333333333333333',
          '.#.#.#.#.#.#.#.#.',
          '.....#.....#.....',
          '......#...#......',
          '.....#######.....',
          '....##.###.##....',
          '...###########...',
          '...#.#######.#...',
          '...#.#.....#.#...',
          '......##.##......',
        ],
      },
    ],
  },

  powerUps: {
    dropChance: 0.2,
    radius: 11,
    fallSpeed: 2,
    glowBlur: 12,
    rarity: {
      common: 4,
      uncommon: 2.5,
      rare: 1.5,
      epic: 1,
    },
    types: [
      { type: 'expand', rarity: 'common', color: '#4ade80', image: 'img/pu-expand.svg' },
      { type: 'slow', rarity: 'common', color: '#38bdf8', image: 'img/pu-slow.svg' },
      { type: 'shrink', rarity: 'common', color: '#fb7185', image: 'img/pu-shrink.svg' },
      { type: 'fast', rarity: 'common', color: '#c084fc', image: 'img/pu-fast.svg' },
      { type: 'magnet', rarity: 'uncommon', color: '#facc15', image: 'img/pu-magnet.svg', durationMs: 8000 },
      { type: 'reverse', rarity: 'uncommon', color: '#ef4444', image: 'img/pu-reverse.svg' },
      { type: 'fireball', rarity: 'uncommon', color: '#fb923c', image: 'img/pu-fireball.svg' },
      { type: 'barrier', rarity: 'rare', color: '#2dd4bf', image: 'img/pu-barrier.svg', durationMs: 10000 },
      { type: 'extraLife', rarity: 'epic', color: '#f472b6', image: 'img/pu-extraLife.svg' },
    ],
  },

  // Run-long upgrades. After each cleared level the player picks one of
  // `choices` random relics; owning a relic `n` times applies `value` n times.
  relics: {
    choices: 3,
    pickDelayMs: 500,
    card: { width: 230, height: 270, gap: 32, sideMargin: 40 },
    // Offer weights. Relics without a `rarity` are common.
    rarity: {
      common: { weight: 6, color: '#94a3b8' },
      rare: { weight: 3, color: '#38bdf8' },
      legendary: { weight: 1, color: '#facc15' },
    },
    splitEvery: 12,
    splitAngle: 0.35,
    maxBalls: 8,
    explosionColor: '#fb923c',
    // A relic listed in another's `conflicts` is not offered while that one is owned.
    pool: [
      { id: 'wide', name: 'Wide Paddle', description: 'Paddle is 20% wider.', value: 0.2, maxStacks: 3, color: '#4ade80' },
      { id: 'lucky', name: 'Lucky Charm', description: '+6% chance that a broken brick drops a power-up.', value: 0.06, maxStacks: 3, color: '#facc15' },
      { id: 'heavy', name: 'Heavy Ball', description: 'Every hit deals +1 damage to armored bricks.', value: 1, maxStacks: 2, color: '#cbd5e1' },
      { id: 'safetyNet', name: 'Safety Net', description: 'Every launch raises a barrier for 6 seconds.', value: 6000, maxStacks: 2, color: '#2dd4bf' },
      { id: 'longFuse', name: 'Long Fuse', description: 'Timed power-ups last 50% longer. Good and bad ones.', value: 0.5, maxStacks: 2, color: '#fb923c' },
      { id: 'greed', name: 'Greed', description: 'Bricks score 50% more points.', value: 0.5, maxStacks: 3, color: '#f472b6' },
      { id: 'steady', name: 'Steady Hand', description: 'The ball moves 8% slower.', value: 0.08, maxStacks: 2, color: '#38bdf8' },
      { id: 'spareHeart', name: 'Spare Heart', description: 'Gain one life right now.', value: 1, maxStacks: Infinity, color: '#ff2e88' },
      { id: 'volatile', name: 'Volatile', rarity: 'rare', description: 'Broken bricks have a 20% chance to explode and hit every brick around them.', value: 0.2, maxStacks: 2, color: '#f97316' },
      { id: 'splitter', name: 'Splitter', rarity: 'rare', description: 'Every 12th brick you break splits a ball in two. A second copy halves the count.', value: 1, maxStacks: 2, color: '#a78bfa' },
      { id: 'ricochet', name: 'Ricochet', rarity: 'rare', description: 'Wall bounces charge the ball (up to 2). A charged ball hits harder and smashes through.', value: 2, maxStacks: 2, color: '#fde047' },
      { id: 'echo', name: 'Echo', rarity: 'rare', description: 'Power-ups count twice: double duration, two lives. Half as many drop.', value: 1, maxStacks: 1, color: '#67e8f9' },
      { id: 'glassCannon', name: 'Glass Cannon', rarity: 'legendary', description: 'Double damage and double points. You drop to 1 life and can never hold more.', value: 1, maxStacks: 1, color: '#f1f5f9', conflicts: ['spareHeart'] },
    ],
  },

  // Consecutive brick hits without touching the paddle build a score multiplier.
  combo: {
    hitsPerStep: 5,
    stepBonus: 0.5,
    maxMultiplier: 4,
    popMs: 250,
    color: '#fde047',
  },

  effects: {
    durationMs: 5000,
    expandScale: 1.5,
    shrinkScale: 1 / 1.5,
    fastScale: 1.5,
    slowScale: 0.6,
    magnetPull: 0.06,
    magnetMaxSpeed: 4,
  },
};
