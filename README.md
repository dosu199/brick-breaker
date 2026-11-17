# Brick Breaker

Plain HTML + Canvas + JavaScript. No build step.

## Run
Open `index.html` in a browser.

Move the mouse to steer the paddle and click to launch the ball. After you win
or lose, click to play again. Press **F** to toggle fullscreen.

The game fills the browser window, leaving a gutter around the play area
(`--gutter` in `css/style.css`). Objects are drawn at their normal size: a bigger
window gives a bigger field. Each new game fits as many brick columns as the
width allows, and resizing mid-game stretches the existing bricks to fit.

## Structure
```
brick-breaker/
├── index.html      page + canvas, loads scripts in order
├── css/style.css
├── img/            SVG sprites (paddle, ball, comet, brick panel, power-up badges)
├── js/
│   ├── config.js     all settings (sizes, speeds, colors, power-ups, sprites)
│   ├── assets.js     image loading (shapes are drawn until images load)
│   ├── render.js     drawing helpers (neon glow)
│   ├── starfield.js  drifting, twinkling star background
│   ├── input.js      mouse state (follows the cursor even in the gutter)
│   ├── paddle.js     Paddle class
│   ├── ball.js       Ball class (position + velocity)
│   ├── bricks.js     Brick entity + Bricks grid
│   ├── collision.js  circle-rect checks and bounce logic
│   ├── powerup.js    falling power-up
│   ├── game.js       game state, resize/scaling, fixed-timestep loop
│   └── main.js       entry point, resize + fullscreen key
└── tests/            node:test suites
```

## Power-ups
Destroyed bricks may drop a power-up (`CONFIG.powerUps.dropChance`).

| Type        | Effect                                    |
|-------------|-------------------------------------------|
| `expand`    | wider paddle                              |
| `shrink`    | narrower paddle                           |
| `fast`      | faster ball                               |
| `slow`      | slower ball                               |
| `fireball`  | ball destroys bricks without bouncing     |
| `extraLife` | +1 life                                   |

Timed effects last `CONFIG.effects.durationMs`. Collecting the same one again
restarts its timer instead of stacking. Losing a life clears all effects.

## Brick lifecycle
`Brick` owns one brick's position, size, color, alive state, and drawing.
`Bricks` creates and manages the grid, using the configured offsets and padding.
The grid is built when `Bricks` is constructed. Call `build()` again only when
intentionally resetting or rebuilding the board; it creates new, alive bricks.
Drawing uses each brick's stored coordinates without changing game state, so
rendering and collision detection can use the same positions.

## Tests
Run `npm test` (or `node --test`) with Node.js 20+. No dependencies are required.

## Look
A modern space theme. The nebula is a CSS background on the canvas
(`css/style.css`); the game draws a parallax starfield (`CONFIG.stars`) and
neon sprites on top. Glows come from the canvas `shadowBlur` (the `glowColor` /
`glowBlur` settings in `config.js`), not from the images, so the sprites stay
tight to their hit areas.

**Performance:** `shadowBlur` and scaled SVGs are too slow to redraw every frame
(a full screen of bricks dropped to ~15 fps). `drawCached` in `js/render.js`
paints each distinct look once into an offscreen canvas and copies it after
that, so give new sprites a cache key that changes whenever their look does.
Stars are drawn with pixel-snapped `fillRect`, the cheapest canvas operation.

## Sprites
Image paths live in `config.js`. To replace the art, drop new files into `img/`
(or point the config elsewhere). The images are drawn at about 3× their
on-screen size so they stay sharp on high-DPI screens.

- **Paddle** (`img/paddle.svg`, 360×36): a starship platform drawn as 3 slices.
  The engine pods at each end (as wide as the image is tall) keep their shape;
  the hull in between stretches, so it should only vary vertically.
- **Ball** (`img/ball.svg`, 48×48): a plasma orb drawn at the ball's size.
- **Fireball** (`img/ball-fire.svg`, 96×96): a comet drawn at
  `CONFIG.ball.fireballSpriteScale` (3×) the ball's size and rotated to the
  direction of travel. The core (radius 16) sits in the center and matches the
  ball; the tail trails toward the left (−x).
- **Brick** (`img/brick.svg`, 210×60): a dark glass panel drawn over the row
  color, leaving a neon rim and "indicator" slits of that color showing.
- **Power-ups** (`img/pu-<type>.svg`, 66×66): hexagonal badges with neon line
  icons. Green and blue are good, red is bad.
