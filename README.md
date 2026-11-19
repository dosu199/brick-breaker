# Brick Breaker

Play game: https://dosu199.github.io/brick-breaker/

Plain HTML + Canvas + JavaScript. No build step.

## Run
Open `index.html` in a browser.

Move the mouse to steer the paddle and click to launch the ball. Clear all five
levels to win; after you win or lose, click to play again. Press **F** to toggle
fullscreen.

The play field is a portrait 800x960 (`CONFIG.view`), taller than it is wide
like the arcade classics, so there's a long drop between the bricks and the
paddle. It is scaled to the largest box of that shape that fits the window,
and it looks and plays the same on every screen: same field, same distances,
only sharper on bigger monitors. Score and level sit in a panel to its left;
lives, relics and the fullscreen hint in a panel to its right. The panels fill
the space beside the field and are at least `--panel-min` (170px) wide;
`main.js` works out the field's size from the window, `--gutter` and
`--panel-min` in `css/style.css`.

Bricks start `offsetTop` (50) below the top edge, leaving room for the ball to
get in behind them. There is always at least `CONFIG.bricks.minPaddleGap` (560
units) of empty space between the lowest brick row and the paddle. Maps with
many rows get thinner bricks rather than eating into it.

## Levels
There are five levels: Wall, Pyramid, Diamond, Checker and Invader. Each uses the
same bricks in a different shape, and levels 2 to 5 are larger (16 to 18
columns, 8 to 10 rows) than the 12x5 opening wall. Clearing a level opens the
upgrade screen (see Relics). Score and lives carry over, and the ball gets
`CONFIG.levels.speedIncrease` (8%) faster each level. Losing all lives ends the
run: you go back to level 1 with no relics.

## Relics
After each cleared level you pick one of three random relics, which last for the
rest of the run. Move the paddle under a card and click, or press **1** to
**3**. Clicks are ignored for the first `pickDelayMs` (0.5 s) so that a click
meant for the ball doesn't pick a card by accident. Owned relics are listed in the
panel to the right of the field.

Relics stack up to `maxStacks`, and a maxed relic is no longer offered. Each one
applies its `value` once per stack:

| Relic       | Per stack                                          | Max |
|-------------|----------------------------------------------------|-----|
| Wide Paddle | paddle 20% wider (multiplies with `expand`)        | 3   |
| Lucky Charm | +6% power-up drop chance                           | 3   |
| Heavy Ball  | +1 damage per hit, so armored bricks break faster  | 2   |
| Safety Net  | every launch raises a 6 s barrier                  | 2   |
| Long Fuse   | timed power-ups last 50% longer, good and bad ones | 2   |
| Greed       | bricks score 50% more                              | 3   |
| Steady Hand | ball 8% slower                                     | 2   |
| Spare Heart | +1 life immediately                                | ∞   |

Those are all common. The rare and legendary relics change how you play rather
than adding a stat:

| Relic        | Rarity    | Effect                                                                                   | Max |
|--------------|-----------|------------------------------------------------------------------------------------------|-----|
| Volatile     | rare      | a broken brick has a 20% chance per stack to explode, hitting all 8 bricks around it; explosions can chain | 2   |
| Splitter     | rare      | every 12th broken brick splits the ball that broke it (every 6th with two stacks), up to `maxBalls` (8) | 2   |
| Ricochet     | rare      | each wall or ceiling bounce stores a charge (2 per stack), shown as rings round the ball. A charged hit deals +1 damage and goes straight through a brick it breaks | 2   |
| Echo         | rare      | power-ups count twice (double duration, Extra Life gives 2) but drop half as often        | 1   |
| Glass Cannon | legendary | double damage and double points; you drop to 1 life and can't gain more, so Spare Heart is no longer offered | 1   |

Offers are drawn by rarity weight (`CONFIG.relics.rarity`: common 6, rare 3,
legendary 1), and each card shows its rarity in the top-right corner. A relic
listed in an owned relic's `conflicts` is not offered.

With Splitter you lose a life only when the last ball falls. Losing a life
always brings you back to a single ball.

Relics are configured in `CONFIG.relics.pool`; `js/relics.js` tracks what the
run owns and rolls the offers.

## Spin
Flick the paddle as the ball hits it to curve the ball. A flick is any paddle
movement of at least `flickSpeed` (6 units per tick). A slower move, or a
still paddle, sends the ball straight.

- **Fixed curve:** every flicked shot bends by the same total angle N
  (`curveAngle`, 35°), away from the side you flicked: flick right and the
  ball bends left, flick left and it bends right. How hard you flick
  doesn't matter, so curved shots are predictable and learnable.
- **Even turn:** the curve is spread evenly over `curveTicks` (40 ticks, about
  2/3 s). After that the ball flies straight. Speed never changes.
- **Walls and bricks:** wall and ceiling bounces keep the curve going. A brick
  bounce ends it.
- **Safety:** a curve can't flatten the ball into an endless sideways bounce.
  At least `minVerticalRatio` (30%) of its speed stays vertical.
- **Trail:** a curving ball leaves a pink trail that fades as the curve runs
  out.

Balls split off by Splitter keep what's left of the curve. All numbers are in
`CONFIG.spin`.

## Combo
Every brick hit, including explosion hits, adds to the combo. Every
`hitsPerStep` (5) hits raise the score multiplier by `stepBonus` (0.5), up to
`maxMultiplier` (×4). The combo resets when a ball touches the paddle, when you
lose a life and when a level starts. While the multiplier is above ×1, it shows
under the bricks and pops each time it goes up. The end screen shows the run's
best combo. Settings are in `CONFIG.combo`.

## Level maps
Levels are text maps in `CONFIG.levels.maps`: `#` is a brick, `.` is a gap, and
each row gets the next brick color. A digit is an armored brick that takes that
many hits (`3` is used in levels 2 to 5). All rows of a map must be the same
length.

Armored bricks are silver with corner bolts. They show cracks after the first
hit, heavier cracks and a chipped corner after the second, and break on the
third. Every hit scores, but power-ups only drop when a brick breaks. A fireball
breaks armor in one hit.

```
name: 'Diamond',
rows: [
  '.......####.......',
  '......######......',
  '.....########.....',
  '....##########....',
  '..######..######..',
  '....##########....',
  '.....########.....',
  '......######......',
  '.......####.......',
],
```

## Structure
```
brick-breaker/
├── index.html      page + canvas, loads scripts in order
├── css/style.css
├── img/            SVG sprites (paddle, ball, comet, brick panel, power-up badges)
├── js/
│   ├── config.js     all settings (sizes, speeds, colors, power-ups, sprites, level maps)
│   ├── assets.js     image loading (shapes are drawn until images load)
│   ├── render.js     drawing helpers (neon glow)
│   ├── starfield.js  drifting, twinkling star background
│   ├── input.js      mouse state (follows the cursor even in the gutter)
│   ├── paddle.js     Paddle class
│   ├── ball.js       Ball class (position + velocity)
│   ├── bricks.js     Brick entity + Bricks grid
│   ├── collision.js  circle-rect checks and bounce logic
│   ├── powerup.js    falling power-up
│   ├── particles.js  spark and shockwave explosions when bricks break
│   ├── relics.js     run-long upgrades: owned stacks and random offers
│   ├── hud.js        score, level progress and lives bar above the game
│   ├── game.js       game state, levels, resize/scaling, fixed-timestep loop
│   └── main.js       entry point, resize + fullscreen key
└── tests/            node:test suites
```

## Power-ups
Destroyed bricks may drop a power-up (`CONFIG.powerUps.dropChance`). How often
each type drops depends on its `rarity`: the stronger the advantage, the rarer.

| Rarity   | Weight | Type        | Effect                                                   | Drop odds |
|----------|--------|-------------|----------------------------------------------------------|-----------|
| common   | 4      | `expand`    | wider paddle                                             | 15% each  |
|          |        | `slow`      | slower ball                                              |           |
|          |        | `shrink`    | narrower paddle (bad)                                    |           |
|          |        | `fast`      | faster ball (bad)                                        |           |
| uncommon | 2.5    | `magnet`    | falling power-ups drift toward the paddle for 8 s        | 10% each  |
|          |        | `reverse`   | paddle mirrors the mouse for 5 s, glowing red (bad)      |           |
|          |        | `fireball`  | ball breaks bricks (and armor) without bouncing          |           |
| rare     | 1.5    | `barrier`   | a line below the paddle bounces the ball for 10 s        | 6%        |
| epic     | 1      | `extraLife` | +1 life                                                  | 4%        |

Timed effects last `CONFIG.effects.durationMs` (5 s) unless the type sets its own
`durationMs`. Collecting the same one again
restarts its timer instead of stacking. Losing a life clears all effects.

The ball's base speed is `CONFIG.ball.speed`; `fast` and `slow` multiply it (x1.5,
x0.6), and so does each level. To stay accurate at high speed the ball moves in
sub-steps no longer than its radius, checking collisions at each one, so it can
never skip through a brick or the paddle.

## Brick lifecycle
`Brick` owns one brick's position, size, color, alive state, and drawing.
`Bricks` creates and manages the grid from a level map, using the configured
offsets and padding; gaps in the map are `null` cells. The grid is built when
`Bricks` is constructed. Call `build()` again only when
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

Breaking a brick bursts sparks in its color (some white-hot) with a faint
shockwave ring (`CONFIG.particles`). They use additive blending for a cheap
glow instead of `shadowBlur`, and are capped at `max` sparks so long fireball
chains stay at 60 fps.

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
