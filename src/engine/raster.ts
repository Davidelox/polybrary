import type { Camera, Group, Scene, Selection, Texture } from './types';

export const W = 320, H = 240;
const NEAR = 0.15;
const FOCAL = (H / 2) / Math.tan(30 * Math.PI / 180);
const FOG0 = 3.5, FOGK = 1 / 15, FOGMAX = 0.88, FOGR = 18, FOGG = 16, FOGB = 26;
const CLEAR = 0xFF000000 | (22 << 16) | (16 << 8) | 18;

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const DITH = new Float32Array(16);
for (let i = 0; i < 16; i++) DITH[i] = (BAYER[i] - 7.5) * 1.5;
const CAM = { x: 0, y: 0, z: 0, cy: 1, sy: 0, cp: 1, sp: 0 };
let FB: Uint32Array = new Uint32Array(0), ZB: Float32Array = new Float32Array(0);
const A = new Float64Array(11), B = new Float64Array(11), C = new Float64Array(11);

function xf(v: number[], o: number, tint: number, out: Float64Array) {
  const dx = v[o] - CAM.x, dy = v[o + 1] - CAM.y, dz = v[o + 2] - CAM.z;
  const rx = dx * CAM.cy + dz * CAM.sy, rz = -dx * CAM.sy + dz * CAM.cy;
  const z0 = -rz;
  out[0] = rx; out[1] = dy * CAM.cp + z0 * CAM.sp; out[2] = z0 * CAM.cp - dy * CAM.sp;
  out[3] = v[o + 3]; out[4] = v[o + 4];
  out[5] = v[o + 5] * tint; out[6] = v[o + 6] * tint; out[7] = v[o + 7] * tint;
}
function proj(a: Float64Array) {
  const iw = 1 / a[2];
  a[8] = Math.round(W / 2 + a[0] * FOCAL * iw);
  a[9] = Math.round(H / 2 - a[1] * FOCAL * iw);
  a[10] = iw;
}
function raster(tex: Texture, a: Float64Array, b: Float64Array, c: Float64Array) {
  const ax = a[8], ay = a[9];
  let bx = b[8], by = b[9], cx = c[8], cy = c[9];
  let area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  if (area === 0) return;
  if (area < 0) { const t = b; b = c; c = t; bx = b[8]; by = b[9]; cx = c[8]; cy = c[9]; area = -area; }
  const minX = Math.max(0, Math.min(ax, bx, cx)), maxX = Math.min(W - 1, Math.max(ax, bx, cx));
  const minY = Math.max(0, Math.min(ay, by, cy)), maxY = Math.min(H - 1, Math.max(ay, by, cy));
  if (minX > maxX || minY > maxY) return;
  const inv = 1 / area;
  const A0 = -(cy - by), B0 = cx - bx, A1 = -(ay - cy), B1 = ax - cx, A2 = -(by - ay), B2 = bx - ax;
  const px0 = minX + 0.5, py0 = minY + 0.5;
  let r0 = A0 * (px0 - bx) + B0 * (py0 - by), r1 = A1 * (px0 - cx) + B1 * (py0 - cy), r2 = A2 * (px0 - ax) + B2 * (py0 - ay);
  const aiw = a[10], biw = b[10], ciw = c[10];
  const au = a[3], bu = b[3], cu = c[3], av = a[4], bv = b[4], cv = c[4];
  const ar = a[5], br = b[5], cr = c[5], ag = a[6], bg = b[6], cg = c[6], ab = a[7], bb = b[7], cb = c[7];
  const td = tex.d, tw = tex.w, mw = tex.mw, mh = tex.mh, fb = FB, zb = ZB;
  for (let y = minY; y <= maxY; y++) {
    let e0 = r0, e1 = r1, e2 = r2, idx = y * W + minX;
    const dy4 = (y & 3) << 2;
    for (let x = minX; x <= maxX; x++, idx++, e0 += A0, e1 += A1, e2 += A2) {
      if (e0 < 0 || e1 < 0 || e2 < 0) continue;
      const w0 = e0 * inv, w1 = e1 * inv, w2 = e2 * inv;
      const iw = w0 * aiw + w1 * biw + w2 * ciw;
      if (iw <= zb[idx]) continue;
      zb[idx] = iw;
      const u = (w0 * au + w1 * bu + w2 * cu) | 0, vv = (w0 * av + w1 * bv + w2 * cv) | 0;
      const ti = (((vv & mh) * tw) + (u & mw)) << 2;
      let r = td[ti] * (w0 * ar + w1 * br + w2 * cr);
      let g = td[ti + 1] * (w0 * ag + w1 * bg + w2 * cg);
      let bl = td[ti + 2] * (w0 * ab + w1 * bb + w2 * cb);
      let f = (1 / iw - FOG0) * FOGK;
      if (f > 0) {
        if (f > FOGMAX) f = FOGMAX;
        r += (FOGR - r) * f; g += (FOGG - g) * f; bl += (FOGB - bl) * f;
      }
      const d = DITH[dy4 | (x & 3)];
      r += d; g += d; bl += d;
      r = r < 0 ? 0 : r > 255 ? 255 : r;
      g = g < 0 ? 0 : g > 255 ? 255 : g;
      bl = bl < 0 ? 0 : bl > 255 ? 255 : bl;
      const r5 = (r | 0) >> 3, g5 = (g | 0) >> 3, b5 = (bl | 0) >> 3;
      fb[idx] = 0xFF000000 | (((b5 << 3) | (b5 >> 2)) << 16) | (((g5 << 3) | (g5 >> 2)) << 8) | ((r5 << 3) | (r5 >> 2));
    }
    r0 += B0; r1 += B1; r2 += B2;
  }
}
function clipDraw(tex: Texture, a: Float64Array, b: Float64Array, c: Float64Array) {
  const poly = [a, b, c], out: Float64Array[] = [];
  for (let i = 0; i < 3; i++) {
    const p = poly[i], q = poly[(i + 1) % 3];
    const pin = p[2] >= NEAR, qin = q[2] >= NEAR;
    if (pin) out.push(p);
    if (pin !== qin) {
      const t = (NEAR - p[2]) / (q[2] - p[2]);
      const r = new Float64Array(11);
      for (let k = 0; k < 8; k++) r[k] = p[k] + (q[k] - p[k]) * t;
      out.push(r);
    }
  }
  if (out.length < 3) return;
  for (let i = 0; i < out.length; i++) proj(out[i]);
  for (let i = 1; i < out.length - 1; i++) raster(tex, out[0], out[i], out[i + 1]);
}
function drawGroup(g: Group, tint: number) {
  const v = g.v, n = v.length, tex = g.tex;
  for (let i = 0; i < n; i += 24) {
    xf(v, i, tint, A); xf(v, i + 8, tint, B); xf(v, i + 16, tint, C);
    const ia = A[2] >= NEAR, ib = B[2] >= NEAR, ic = C[2] >= NEAR;
    if (ia && ib && ic) { proj(A); proj(B); proj(C); raster(tex, A, B, C); }
    else if (!ia && !ib && !ic) continue;
    else clipDraw(tex, A, B, C);
  }
}
export function render(fb: Uint32Array, zb: Float32Array, scene: Scene, cam: Camera, sel: Selection) {
  FB = fb; ZB = zb;
  fb.fill(CLEAR); zb.fill(0);
  CAM.x = cam.x; CAM.y = cam.y; CAM.z = cam.z;
  CAM.cy = Math.cos(cam.yaw); CAM.sy = Math.sin(cam.yaw);
  CAM.cp = Math.cos(cam.pitch); CAM.sp = Math.sin(cam.pitch);
  for (let i = 0; i < scene.statics.length; i++) drawGroup(scene.statics[i], 1);
  for (let si = 0; si < scene.shelves.length; si++) {
    const s = scene.shelves[si];
    const dim = sel.overview ? 1 : (si === sel.shelf ? 1 : 0.6);
    for (let k = 0; k < s.frame.length; k++) drawGroup(s.frame[k], dim);
    for (let k = 0; k < s.plate.length; k++) drawGroup(s.plate[k], dim);
    for (let ci = 0; ci < s.cells.length; ci++) {
      const on = !sel.overview && si === sel.shelf && ci === sel.cell;
      drawGroup(s.cells[ci].items, dim * (on ? 1.4 : 1));
      if (on) drawGroup(s.cells[ci].cursor, 0.75 + 0.25 * Math.sin(sel.t * 6));
    }
  }
}
