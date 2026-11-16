class PowerUp {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.type = CONFIG.powerUps.types[Math.floor(Math.random() * CONFIG.powerUps.types.length)];
        this.radius = 10;
    }

    move() {
        this.y += 2;
    }

    draw(ctx) {
    ctx.fillStyle =  this.type[Object.keys(this.type)[0]].color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    }
}


