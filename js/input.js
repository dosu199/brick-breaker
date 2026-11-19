class Input {
  constructor(canvas, world) {
    this.mouseX = world.width / 2;
    this.launchRequested = false;
    this.choiceRequested = null;

    window.addEventListener('mousemove', (e) => {
      const rect = canvas.getBoundingClientRect();
      this.mouseX = (e.clientX - rect.left - canvas.clientLeft) * (world.width / canvas.clientWidth);
    });

    canvas.addEventListener('mousedown', () => {
      this.launchRequested = true;
    });

    // number keys pick an upgrade card: 1 is the first card
    window.addEventListener('keydown', (e) => {
      if (e.key >= '1' && e.key <= '9') this.choiceRequested = Number(e.key) - 1;
    });
  }

  consumeLaunch() {
    const requested = this.launchRequested;
    this.launchRequested = false;
    return requested;
  }

  consumeChoice() {
    const choice = this.choiceRequested;
    this.choiceRequested = null;
    return choice;
  }
}
