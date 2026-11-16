// All tweakable game settings in one place.

const CONFIG = {
  canvas: {
    width: 800,
    height: 600,
  },

  paddle: {
    width: 100,
    height: 12,
    speed: 7,
    color: '#4fc3f7',
  },

  ball: {
    radius: 8,
    speed: 5,
    color: '#fff',
  },

  bricks: {
    rows: 5,
    cols: 10,
    width: 70,
    height: 20,
    padding: 8,
    offsetTop: 10,
    offsetLeft: 10,
    colors: ['#e57373', '#ffb74d', '#fff176', '#81c784', '#64b5f6'],
  },

  lives: 3,
};
