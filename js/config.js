const CONFIG = {
  view: {
    width: 1200,
    height: 600,
    minScale: 0.75,
    maxScale: 1.6,
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
    glowBlur: 12,
    image: 'img/paddle.svg',
  },

  ball: {
    radius: 8,
    speed: 10,
    maxBounceAngle: Math.PI / 3,
    color: '#a5f3fc',
    fireballColor: '#fb923c',
    glowColor: '#22d3ee',
    fireballGlowColor: '#f97316',
    glowBlur: 14,
    image: 'img/ball.svg',
    fireballImage: 'img/ball-fire.svg',
    fireballSpriteScale: 3,
  },

  bricks: {
    height: 20,
    maxWidth: 110,
    gapRatio: 0.1,
    maxGridHeightRatio: 0.5,
    padding: 7,
    offsetTop: 20,
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
    types: [
      { type: 'expand', weight: 3, color: '#4ade80', image: 'img/pu-expand.svg' },
      { type: 'shrink', weight: 2, color: '#fb7185', image: 'img/pu-shrink.svg' },
      { type: 'fast', weight: 2, color: '#c084fc', image: 'img/pu-fast.svg' },
      { type: 'slow', weight: 3, color: '#38bdf8', image: 'img/pu-slow.svg' },
      { type: 'extraLife', weight: 1, color: '#f472b6', image: 'img/pu-extraLife.svg' },
      { type: 'fireball', weight: 2, color: '#fb923c', image: 'img/pu-fireball.svg' },
      { type: 'barrier', weight: 2, color: '#2dd4bf', image: 'img/pu-barrier.svg', durationMs: 10000 },
    ],
  },

  effects: {
    durationMs: 5000,
    expandScale: 1.5,
    shrinkScale: 1 / 1.5,
    fastScale: 1.5,
    slowScale: 0.6,
  },
};
