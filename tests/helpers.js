const { readFileSync } = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadScripts(files, exportNames, globals = {}) {
  const source = files
    .map(file => readFileSync(path.join(__dirname, '..', 'js', file), 'utf8'))
    .join('\n');
  return vm.runInNewContext(`${source}\n({ ${exportNames.join(', ')} });`, globals);
}

function createDrawingContext() {
  return {
    rectangles: [],
    fillStyle: '',
    path: null,
    beginPath() {
      this.path = null;
    },
    roundRect(x, y, width, height) {
      this.path = { x, y, width, height };
    },
    images: [],
    arc() {},
    drawImage(image, ...args) {
      this.images.push({ image, args });
    },
    fill() {
      if (this.path) this.rectangles.push({ ...this.path, color: this.fillStyle });
    },
    fillText() {},
    stroke() {},
    moveTo() {},
    lineTo() {},
    setTransform() {},
    getTransform() {
      return { a: 1, b: 0 };
    },
    fillRect() {},
    globalAlpha: 1,
    transforms: [],
    save() {},
    restore() {},
    translate(x, y) {
      this.transforms.push(['translate', x, y]);
    },
    rotate(angle) {
      this.transforms.push(['rotate', angle]);
    },
    clearRect() {
      this.rectangles.length = 0;
    },
  };
}

module.exports = { loadScripts, createDrawingContext };
