// Mouse input: paddle follows the cursor, click launches the ball.

class Input {
  constructor(canvas) {
    this.mouseX = canvas.width / 2;  // start the paddle in the middle
    this.launch = false;

    canvas.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      const scale = canvas.width / rect.width;
      this.mouseX = (e.clientX - rect.left) * scale;
    });

    canvas.addEventListener('mousedown', () => {
      this.launch = true;
    });
    canvas.addEventListener('mouseup', () => {
      this.launch = false;
    });
  }
}