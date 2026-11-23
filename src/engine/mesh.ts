import type { Group as GroupT, Texture, Vec3 } from './types';

export class Group implements GroupT {
  tex: Texture;
  v: number[] = [];
  constructor(tex: Texture) { this.tex = tex; }
}
function push(V: number[], p: Vec3, u: number, v: number, c: Vec3) { V.push(p[0], p[1], p[2], u, v, c[0], c[1], c[2]); }
export function quad(g: GroupT, p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, u0: number, v0: number, u1: number, v1: number, c0: Vec3, c1: Vec3, c2: Vec3, c3: Vec3) {
  const V = g.v;
  push(V, p0, u0, v0, c0); push(V, p1, u1, v0, c1); push(V, p2, u1, v1, c2);
  push(V, p0, u0, v0, c0); push(V, p2, u1, v1, c2); push(V, p3, u0, v1, c3);
}
const LIGHTS = [[0, 4.2, -1.2, 1.05, 0.045], [6.3, 2.5, -4.7, 0.7, 0.26], [-6.2, 1.2, -4.6, 0.25, 0.4]];
function lightAt(x: number, y: number, z: number): number {
  let L = 0.2;
  for (let i = 0; i < LIGHTS.length; i++) {
    const l = LIGHTS[i], dx = x - l[0], dy = y - l[1], dz = z - l[2];
    L += l[3] / (1 + (dx * dx + dy * dy + dz * dz) * l[4]);
  }
  return Math.min(L, 1.4);
}
const WARM = [1.0, 0.95, 0.84];
export function litCol(base: Vec3, x: number, y: number, z: number, k?: number): Vec3 {
  const L = lightAt(x, y, z) * (k === undefined ? 1 : k);
  return [base[0] * L * WARM[0], base[1] * L * WARM[1], base[2] * L * WARM[2]];
}
export const F_FRONT = 1, F_BACK = 2, F_LEFT = 4, F_RIGHT = 8, F_TOP = 16, F_BOTTOM = 32, F_ALL = 63;
const SHADE = { f: 1.0, b: 0.7, l: 0.8, r: 0.92, t: 1.12, d: 0.55 };
export function box(g: GroupT, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number, base: Vec3, faces: number, s = 0, lightK?: number) {
  const L = lightAt((x0 + x1) / 2, (y0 + y1) / 2, z1) * (lightK === undefined ? 1 : lightK);
  const col = (k: number): Vec3 => [base[0] * L * WARM[0] * k, base[1] * L * WARM[1] * k, base[2] * L * WARM[2] * k];
  const tw = g.tex.w, th = g.tex.h;
  const U = (d: number) => s > 0 ? d * s : tw, Vv = (d: number) => s > 0 ? d * s : th;
  const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
  let c: Vec3;
  if (faces & F_FRONT) { c = col(SHADE.f); quad(g, [x0, y1, z1], [x1, y1, z1], [x1, y0, z1], [x0, y0, z1], 0, 0, U(dx), Vv(dy), c, c, c, c); }
  if (faces & F_BACK) { c = col(SHADE.b); quad(g, [x1, y1, z0], [x0, y1, z0], [x0, y0, z0], [x1, y0, z0], 0, 0, U(dx), Vv(dy), c, c, c, c); }
  if (faces & F_LEFT) { c = col(SHADE.l); quad(g, [x0, y1, z0], [x0, y1, z1], [x0, y0, z1], [x0, y0, z0], 0, 0, U(dz), Vv(dy), c, c, c, c); }
  if (faces & F_RIGHT) { c = col(SHADE.r); quad(g, [x1, y1, z1], [x1, y1, z0], [x1, y0, z0], [x1, y0, z1], 0, 0, U(dz), Vv(dy), c, c, c, c); }
  if (faces & F_TOP) { c = col(SHADE.t); quad(g, [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], 0, 0, U(dx), Vv(dz), c, c, c, c); }
  if (faces & F_BOTTOM) { c = col(SHADE.d); quad(g, [x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0], 0, 0, U(dx), Vv(dz), c, c, c, c); }
}
export function grid(g: GroupT, o: Vec3, du: Vec3, dv: Vec3, nu: number, nv: number, cell: number, base: Vec3, k?: number) {
  const P = (i: number, j: number): Vec3 => [o[0] + du[0] * i / nu + dv[0] * j / nv, o[1] + du[1] * i / nu + dv[1] * j / nv, o[2] + du[2] * i / nu + dv[2] * j / nv];
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = P(i, j), b = P(i + 1, j), c = P(i + 1, j + 1), d = P(i, j + 1);
    const C = (p: Vec3) => litCol(base, p[0], p[1], p[2], k);
    quad(g, a, b, c, d, i * cell, j * cell, (i + 1) * cell, (j + 1) * cell, C(a), C(b), C(c), C(d));
  }
}
