// All tweakable game settings in one place.

const CONFIG = {
  canvas: {
    width: 1400,
    height: 800,
  },

  paddle: {
    width: 100,
    height: 12,
    speed: 7,
    color: '#6366f1',
  },

  ball: {
    radius: 8,
    speed: 5,
    color: '#ffffff',
  },

  bricks: {
    rows: 5,
    cols: 18,
    width: 70,
    height: 20,
    padding: 7,
    offsetTop: 10,
    offsetLeft: 10,
    colors: ['#ff4d8d', '#c86bfa', '#7c83ff', '#38bdf8', '#2dd4bf'],
  },
  lives: 3,
  powerUps: {
    types: [
      { expand: { color: '#ca7494' } },
      { shrink: { color: '#b789d1' } },
      { fast: { color: '#8487ca' } },
      { slow: { color: '#87b6c9' } },
      { extraLife: { color: '#7dbeb7' } },
    ],
  },
};
