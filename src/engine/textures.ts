import type { Texture } from './types';

export function hash(x: number, y: number, s: number): number {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
export function rngFrom(seed: number): () => number {
  let s = seed >>> 0;
  return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
}
export function hex(h: string): number[] { return [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255]; }
export function makeTex(w: number, h: number, fn: (x: number, y: number) => number[]): Texture {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = fn(x, y), i = (y * w + x) * 4;
    d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
  }
  return { w, h, d, mw: w - 1, mh: h - 1 };
}

// ---------- textures (grimy, low-res, nearest) ----------
export const T = {} as Record<'white' | 'floor' | 'wall' | 'wood' | 'rug' | 'poster', Texture>;
T.white = makeTex(2, 2, () => [255, 255, 255]);
T.floor = makeTex(32, 32, (x, y) => {
  const tile = ((x >> 4) + (y >> 4)) & 1;
  let g = tile ? 104 : 82;
  if ((x & 15) === 0 || (y & 15) === 0) g -= 40;
  g += (hash(x, y, 1) - 0.5) * 36 + (hash(x >> 2, y >> 2, 7) - 0.5) * 34;
  return [g * 0.9, g * 0.98, g * 1.14];
});
T.wall = makeTex(32, 32, (x, y) => {
  let g = 134 + (hash(x >> 1, y >> 1, 2) - 0.5) * 38 + (hash(x >> 3, y >> 3, 5) - 0.5) * 44;
  if ((y & 15) === 0 || (((x + (((y >> 4) & 1) * 8)) & 15) === 0)) g -= 34;
  return [g * 1.02, g * 0.97, g * 0.88];
});
T.wood = makeTex(32, 32, (x, y) => {
  let v = 190 + (hash(0, y, 3) - 0.5) * 70 + (hash(x >> 2, y >> 1, 4) - 0.5) * 46;
  if ((x & 15) === 0) v -= 55;
  return [v, v * 0.95, v * 0.9];
});
T.rug = makeTex(32, 32, (x, y) => {
  const d = Math.max(Math.abs(x - 15.5), Math.abs(y - 15.5));
  let c;
  if (d < 3) c = [170, 130, 60]; else if (d < 7) c = [120, 48, 46]; else if (d < 10) c = [168, 150, 112];
  else if (d < 13) c = [52, 92, 98]; else c = [112, 44, 44];
  const n = (hash(x, y, 8) - 0.5) * 30;
  return [c[0] + n, c[1] + n, c[2] + n];
});
T.poster = makeTex(24, 32, (x, y) => {
  const n = (hash(x, y, 11) - 0.5) * 24;
  if (x < 1 || x > 22 || y < 1 || y > 30) return [200, 190, 160];
  const dx = x - 12, dy = y - 14;
  if (dx * dx + dy * dy < 30) return [235 + n, 190 + n, 90 + n];
  if (y > 21) return [50 + n, 40 + n, 70 + n];
  const t = y / 21;
  return [(110 + 90 * t) + n, (60 + 40 * t) + n, (120 - 50 * t) + n];
});
function pat(kind: number): Texture {
  return makeTex(16, 16, (x, y) => {
    let v = 232;
    if (kind === 0) { if (y < 3) v = 140; if (y >= 6 && y <= 9 && x > 2 && x < 13) v = 255; if (x === 0 || x === 15) v = 170; }
    else if (kind === 1) { if (x % 4 === 0) v = 165; if (y > 12) v = 190; }
    else if (kind === 2) { if (y < 2 || y > 13) v = 165; if (y >= 5 && y <= 7 && x > 2 && x < 13) v = 255; if (y === 10 && x > 3 && x < 12) v = 190; }
    else if (kind === 3) { const dx = x - 7.5, dy = y - 7.5, q = dx * dx + dy * dy; if (x === 0 || x === 15 || y === 0 || y === 15) v = 160; if (q < 20) v = 255; if (q < 5) v = 130; }
    else if (kind === 4) { if (x < 2 || x > 13 || y < 2 || y > 13) v = 165; else if (((x + y) & 3) === 0) v = 200; }
    else { if (y < 3) v = 135; if (y >= 4 && y < 12 && x > 1 && x < 14) v = 250; if (x === 0 || x === 15) v = 170; }
    v -= hash(x, y, 9) * 22;
    return [v, v, v];
  });
}
export const PAT = [0, 1, 2, 3, 4, 5].map(pat);

const FONT: Record<string, number[]> = {
  A: [2, 5, 7, 5, 5], B: [6, 5, 6, 5, 6], C: [3, 4, 4, 4, 3], D: [6, 5, 5, 5, 6], E: [7, 4, 6, 4, 7], F: [7, 4, 6, 4, 4],
  G: [3, 4, 5, 5, 3], H: [5, 5, 7, 5, 5], I: [7, 2, 2, 2, 7], J: [1, 1, 1, 5, 2], K: [5, 5, 6, 5, 5], L: [4, 4, 4, 4, 7],
  M: [5, 7, 7, 5, 5], N: [6, 5, 5, 5, 5], O: [2, 5, 5, 5, 2], P: [6, 5, 6, 4, 4], Q: [2, 5, 5, 6, 3], R: [6, 5, 6, 5, 5],
  S: [3, 4, 2, 1, 6], T: [7, 2, 2, 2, 2], U: [5, 5, 5, 5, 7], V: [5, 5, 5, 5, 2], W: [5, 5, 7, 7, 5], X: [5, 5, 2, 5, 5],
  Y: [5, 5, 2, 2, 2], Z: [7, 1, 2, 4, 7], ' ': [0, 0, 0, 0, 0]
};
export function textTex(text: string, w: number, h: number, bg: number[], fg: number[]): Texture {
  const tw = text.length * 8 - 2, ox = ((w - tw) >> 1), oy = ((h - 10) >> 1);
  const mask = new Uint8Array(w * h);
  for (let ci = 0; ci < text.length; ci++) {
    const g = FONT[text[ci]] || FONT[' '];
    for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r] & (4 >> c)) {
      for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
        const X = ox + ci * 8 + c * 2 + dx, Y = oy + r * 2 + dy;
        if (X >= 0 && X < w && Y >= 0 && Y < h) mask[Y * w + X] = 1;
      }
    }
  }
  return makeTex(w, h, (x, y) => {
    const edge = x < 2 || y < 2 || x >= w - 2 || y >= h - 2;
    const n = (hash(x, y, 12) - 0.5) * 18;
    if (mask[y * w + x]) return [fg[0] + n, fg[1] + n, fg[2] + n];
    if (edge) return [bg[0] * 0.6, bg[1] * 0.6, bg[2] * 0.6];
    return [bg[0] + n, bg[1] + n, bg[2] + n];
  });
}
