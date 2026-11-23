import { H, W, render } from './engine/raster';
import type { Camera } from './engine/types';
import { buildScene } from './scene';
import { createHud } from './ui/hud';

const scene = buildScene();
const cv = document.getElementById('cv') as HTMLCanvasElement;
const ctx = cv.getContext('2d')!;
const img = ctx.createImageData(W, H), fb = new Uint32Array(img.data.buffer), zb = new Float32Array(W * H);
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

const state = createHud(scene);
const cam: Camera = { x: 0, y: 1.85, z: 0.8, yaw: 0, pitch: 0.02 };
let mx = 0, my = 0;

document.getElementById('stage')!.addEventListener('pointermove', function (e) {
  const r = (this as HTMLElement).getBoundingClientRect();
  mx = ((e.clientX - r.left) / r.width - 0.5) * 2; my = ((e.clientY - r.top) / r.height - 0.5) * 2;
});

let last = 0;
const t0 = performance.now();
function frame(ts: number) {
  requestAnimationFrame(frame);
  if (ts - last < 33) return;
  last = ts;
  let tx, ty, tz;
  if (state.overview) { tx = 0; ty = 2.1; tz = 2.9; }
  else { tx = scene.shelfX[state.shelf] * 0.85; ty = 1.85; tz = 0.8; }
  const k = 0.12;
  cam.x += (tx - cam.x) * k; cam.y += (ty - cam.y) * k; cam.z += (tz - cam.z) * k;
  const amp = reduce ? 0 : 1;
  const yaw = -mx * 0.05 * amp, pitch = 0.02 + my * 0.03 * amp;
  cam.yaw += (yaw - cam.yaw) * 0.1; cam.pitch += (pitch - cam.pitch) * 0.1;
  const t = (ts - t0) / 1000;
  render(fb, zb, scene, cam, { overview: state.overview, shelf: state.shelf, cell: state.cell, t: reduce ? 0 : t });
  ctx.putImageData(img, 0, 0);
}
requestAnimationFrame(frame);
