import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { PNG } from 'pngjs';
import { expect, test } from 'vitest';
import { H, W, buildScene, render } from '../src/engine/engine.js';

// Fotogramas de referencia: SHA-256 del framebuffer por escenario (V8/Node).
// UPDATE_GOLDEN=1 regenera tests/golden/frames.json y vuelca PNG en tests/__out__/.
const GOLDEN = decodeURIComponent(new URL('./golden/frames.json', import.meta.url).pathname);
const OUT = decodeURIComponent(new URL('./__out__/', import.meta.url).pathname);

const scene = buildScene();
const fb = new Uint32Array(W * H);
const zb = new Float32Array(W * H);

interface Cam { x: number; y: number; z: number; yaw: number; pitch: number }
interface Sel { overview: boolean; shelf: number; cell: number; t: number }
const focusCam = (shelf: number): Cam => ({ x: scene.shelfX[shelf] * 0.85, y: 1.85, z: 0.8, yaw: 0, pitch: 0.02 });

const scenarios: Record<string, { cam: Cam; sel: Sel }> = {};
for (const shelf of [0, 1, 2]) for (const cell of [0, 3, 5]) for (const t of [0, 0.4]) {
  scenarios[`focus-s${shelf}-c${cell}-t${t}`] = { cam: focusCam(shelf), sel: { overview: false, shelf, cell, t } };
}
scenarios['overview'] = { cam: { x: 0, y: 2.1, z: 2.9, yaw: 0, pitch: 0.02 }, sel: { overview: true, shelf: 1, cell: 0, t: 0 } };
scenarios['parallax'] = { cam: { ...focusCam(1), yaw: -0.05, pitch: 0.05 }, sel: { overview: false, shelf: 1, cell: 0, t: 0 } };
// Cámara a 0,12-0,17 de la estantería: fuerza el recorte contra el plano cercano (clipDraw)
scenarios['nearclip'] = { cam: { x: 0, y: 1.85, z: -4.9, yaw: 0, pitch: 0.02 }, sel: { overview: false, shelf: 1, cell: 0, t: 0.4 } };

function frame(name: string): string {
  const s = scenarios[name];
  render(fb, zb, scene, s.cam, s.sel);
  const bytes = new Uint8Array(fb.buffer);
  if (process.env.UPDATE_GOLDEN) {
    mkdirSync(OUT, { recursive: true });
    const png = new PNG({ width: W, height: H });
    png.data.set(bytes);
    writeFileSync(`${OUT}${name}.png`, PNG.sync.write(png));
  }
  return createHash('sha256').update(bytes).digest('hex');
}

test('fotogramas de referencia', () => {
  const got: Record<string, string> = {};
  for (const name of Object.keys(scenarios)) got[name] = frame(name);
  if (process.env.UPDATE_GOLDEN) {
    writeFileSync(GOLDEN, JSON.stringify(got, null, 2) + '\n');
    return;
  }
  expect(got).toEqual(JSON.parse(readFileSync(GOLDEN, 'utf8')));
});
