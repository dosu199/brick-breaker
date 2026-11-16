# Brick Breaker

Plain HTML + Canvas + JavaScript. No build step.

## Run
Open `index.html` in a browser.

## Structure
```
brick-breaker/
├── index.html      page + canvas, loads scripts in order
├── css/style.css
└── js/
    ├── config.js     all settings (sizes, speeds, colors)
    ├── input.js      keyboard/mouse state
    ├── paddle.js     Paddle class
    ├── ball.js       Ball class (position + velocity)
    ├── bricks.js     Brick entity + Bricks grid
    ├── collision.js  circle-rect checks and bounce logic
    ├── game.js       game state + loop
    └── main.js       entry point
```

## Suggested order
1. `input.js` + `paddle.js`: get the paddle moving
2. `ball.js`: movement and wall bounces
3. `collision.js`: ball vs paddle
4. `bricks.js` + brick collisions
5. Lives, score, win/lose in `game.js`

## Brick lifecycle
`Brick` owns one brick's position, size, color, alive state, and drawing.
`Bricks` creates and manages the grid, using the configured offsets and padding.
The grid is built when `Bricks` is constructed. Call `build()` again only when
intentionally resetting or rebuilding the board; it creates new, alive bricks.
Drawing uses each brick's stored coordinates without changing game state, so
rendering and collision detection can use the same positions.

## Tests
Run `node --test` with a current Node.js installation. No dependencies are required.
