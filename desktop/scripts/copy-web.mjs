// Copies the game from the repo root into desktop/dist, which Tauri bundles.
// The game files are only read, never changed. The copied index.html gets one
// extra <script> for the desktop-only tweaks in desktop/web/desktop.js.
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const desktop = join(dirname(fileURLToPath(import.meta.url)), '..');
const game = join(desktop, '..');
const dist = join(desktop, 'dist');

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist);

for (const folder of ['css', 'js', 'img']) {
  cpSync(join(game, folder), join(dist, folder), { recursive: true });
}
cpSync(join(desktop, 'web', 'desktop.js'), join(dist, 'desktop.js'));

const html = readFileSync(join(game, 'index.html'), 'utf8');
if (!html.includes('</body>')) throw new Error('index.html has no </body> to add the desktop script before');
writeFileSync(join(dist, 'index.html'), html.replace('</body>', '  <script src="desktop.js"></script>\n</body>'));

console.log(`Copied the game into ${dist}`);
