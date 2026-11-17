class Input {
  constructor(canvas, world) {
    this.mouseX = world.width / 2;
    this.launchRequested = false;

    window.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouseX = (e.clientX - rect.left - canvas.clientLeft) * (world.width / canvas.clientWidth);
    });

    canvas.addEventListener('mousedown', () => {
      this.launchRequested = true;
    });
  }

  consumeLaunch() {
    const requested = this.launchRequested;
    this.launchRequested = false;
    return requested;
  }
}
