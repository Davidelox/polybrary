// Polybrary: software 3D renderer with a PS1 look (320x240, affine textures,
// integer-snapped vertices, vertex lighting, ordered dither, 15-bit colour).
  const W = 320, H = 240, NEAR = 0.15;
  const FOCAL = (H / 2) / Math.tan(30 * Math.PI / 180);
  const FOG0 = 3.5, FOGK = 1 / 15, FOGMAX = 0.88, FOGR = 18, FOGG = 16, FOGB = 26;
  const CLEAR = 0xFF000000 | (22 << 16) | (16 << 8) | 18;

  // ---------- utilities ----------
  function hash(x, y, s) {
    let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }
  function rngFrom(seed) {
    let s = seed >>> 0;
    return function () { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; };
  }
  function hex(h) { return [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255]; }
  function makeTex(w, h, fn) {
    const d = new Uint8ClampedArray(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const c = fn(x, y), i = (y * w + x) * 4;
      d[i] = c[0]; d[i + 1] = c[1]; d[i + 2] = c[2]; d[i + 3] = 255;
    }
    return { w, h, d, mw: w - 1, mh: h - 1 };
  }

  // ---------- textures (grimy, low-res, nearest) ----------
  const T = {};
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
  function pat(kind) {
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
  const PAT = [0, 1, 2, 3, 4, 5].map(pat);

  const FONT = {
    A: [2, 5, 7, 5, 5], B: [6, 5, 6, 5, 6], C: [3, 4, 4, 4, 3], D: [6, 5, 5, 5, 6], E: [7, 4, 6, 4, 7], F: [7, 4, 6, 4, 4],
    G: [3, 4, 5, 5, 3], H: [5, 5, 7, 5, 5], I: [7, 2, 2, 2, 7], J: [1, 1, 1, 5, 2], K: [5, 5, 6, 5, 5], L: [4, 4, 4, 4, 7],
    M: [5, 7, 7, 5, 5], N: [6, 5, 5, 5, 5], O: [2, 5, 5, 5, 2], P: [6, 5, 6, 4, 4], Q: [2, 5, 5, 6, 3], R: [6, 5, 6, 5, 5],
    S: [3, 4, 2, 1, 6], T: [7, 2, 2, 2, 2], U: [5, 5, 5, 5, 7], V: [5, 5, 5, 5, 2], W: [5, 5, 7, 7, 5], X: [5, 5, 2, 5, 5],
    Y: [5, 5, 2, 2, 2], Z: [7, 1, 2, 4, 7], ' ': [0, 0, 0, 0, 0]
  };
  function textTex(text, w, h, bg, fg) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const px = new Array(w * h);
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

  // ---------- geometry ----------
  class Group {
    constructor(tex) { this.tex = tex; this.v = []; }
  }
  function push(V, p, u, v, c) { V.push(p[0], p[1], p[2], u, v, c[0], c[1], c[2]); }
  function quad(g, p0, p1, p2, p3, u0, v0, u1, v1, c0, c1, c2, c3) {
    const V = g.v;
    push(V, p0, u0, v0, c0); push(V, p1, u1, v0, c1); push(V, p2, u1, v1, c2);
    push(V, p0, u0, v0, c0); push(V, p2, u1, v1, c2); push(V, p3, u0, v1, c3);
  }
  const LIGHTS = [[0, 4.2, -1.2, 1.05, 0.045], [6.3, 2.5, -4.7, 0.7, 0.26], [-6.2, 1.2, -4.6, 0.25, 0.4]];
  function lightAt(x, y, z) {
    let L = 0.2;
    for (let i = 0; i < LIGHTS.length; i++) {
      const l = LIGHTS[i], dx = x - l[0], dy = y - l[1], dz = z - l[2];
      L += l[3] / (1 + (dx * dx + dy * dy + dz * dz) * l[4]);
    }
    return Math.min(L, 1.4);
  }
  const WARM = [1.0, 0.95, 0.84];
  function litCol(base, x, y, z, k) {
    const L = lightAt(x, y, z) * (k === undefined ? 1 : k);
    return [base[0] * L * WARM[0], base[1] * L * WARM[1], base[2] * L * WARM[2]];
  }
  const F_FRONT = 1, F_BACK = 2, F_LEFT = 4, F_RIGHT = 8, F_TOP = 16, F_BOTTOM = 32, F_ALL = 63;
  const SHADE = { f: 1.0, b: 0.7, l: 0.8, r: 0.92, t: 1.12, d: 0.55 };
  function box(g, x0, y0, z0, x1, y1, z1, base, faces, s, lightK) {
    const L = lightAt((x0 + x1) / 2, (y0 + y1) / 2, z1) * (lightK === undefined ? 1 : lightK);
    const col = (k) => [base[0] * L * WARM[0] * k, base[1] * L * WARM[1] * k, base[2] * L * WARM[2] * k];
    const tw = g.tex.w, th = g.tex.h;
    const U = (d) => s > 0 ? d * s : tw, Vv = (d) => s > 0 ? d * s : th;
    const dx = x1 - x0, dy = y1 - y0, dz = z1 - z0;
    let c;
    if (faces & F_FRONT) { c = col(SHADE.f); quad(g, [x0, y1, z1], [x1, y1, z1], [x1, y0, z1], [x0, y0, z1], 0, 0, U(dx), Vv(dy), c, c, c, c); }
    if (faces & F_BACK) { c = col(SHADE.b); quad(g, [x1, y1, z0], [x0, y1, z0], [x0, y0, z0], [x1, y0, z0], 0, 0, U(dx), Vv(dy), c, c, c, c); }
    if (faces & F_LEFT) { c = col(SHADE.l); quad(g, [x0, y1, z0], [x0, y1, z1], [x0, y0, z1], [x0, y0, z0], 0, 0, U(dz), Vv(dy), c, c, c, c); }
    if (faces & F_RIGHT) { c = col(SHADE.r); quad(g, [x1, y1, z1], [x1, y1, z0], [x1, y0, z0], [x1, y0, z1], 0, 0, U(dz), Vv(dy), c, c, c, c); }
    if (faces & F_TOP) { c = col(SHADE.t); quad(g, [x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1], 0, 0, U(dx), Vv(dz), c, c, c, c); }
    if (faces & F_BOTTOM) { c = col(SHADE.d); quad(g, [x0, y0, z1], [x1, y0, z1], [x1, y0, z0], [x0, y0, z0], 0, 0, U(dx), Vv(dz), c, c, c, c); }
  }
  function grid(g, o, du, dv, nu, nv, cell, base, k) {
    const P = (i, j) => [o[0] + du[0] * i / nu + dv[0] * j / nv, o[1] + du[1] * i / nu + dv[1] * j / nv, o[2] + du[2] * i / nu + dv[2] * j / nv];
    for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
      const a = P(i, j), b = P(i + 1, j), c = P(i + 1, j + 1), d = P(i, j + 1);
      const C = (p) => litCol(base, p[0], p[1], p[2], k);
      quad(g, a, b, c, d, i * cell, j * cell, (i + 1) * cell, (j + 1) * cell, C(a), C(b), C(c), C(d));
    }
  }

  // ---------- scene ----------
  const SECTIONS = [
    { label: 'PELÍCULAS', pat: 0, pal: ['#8f4a38', '#b07a42', '#6e2f2f', '#a89070'], wMin: .06, wMax: .09, hMin: .62, hMax: .74, depth: .5 },
    { label: 'SERIES', pat: 1, pal: ['#5d4a7a', '#7d6a9e', '#3f3558', '#9a8fb5'], wMin: .08, wMax: .11, hMin: .58, hMax: .7, depth: .5 },
    { label: 'LIBROS', pat: 2, pal: ['#4a6b52', '#6f8a5e', '#35524a', '#9aa68a'], wMin: .06, wMax: .16, hMin: .6, hMax: .95, depth: .6 },
    { label: 'MÚSICA', pat: 3, pal: ['#8f3f5a', '#b5788f', '#5d2a3d', '#c9a0a8'], wMin: .05, wMax: .07, hMin: .42, hMax: .5, depth: .45 },
    { label: 'JUEGOS DE MESA', pat: 4, pal: ['#b08a2e', '#8f5f1e', '#6e4a1a', '#d1b46a'], wMin: .24, wMax: .4, hMin: .34, hMax: .55, depth: .65 },
    { label: 'VIDEOJUEGOS', pat: 5, pal: ['#3a5f8f', '#4f8a9e', '#27456b', '#8fb0c9'], wMin: .06, wMax: .08, hMin: .62, hMax: .72, depth: .45 }
  ];
  const SHELVES = [
    { name: 'TÚ', plate: 'TU', x: -4.3, w: 3.2, h: 3.2, bg: [64, 84, 128], fg: [236, 236, 240] },
    { name: 'LOS DOS', plate: 'LOS DOS', x: 0, w: 4.4, h: 3.6, bg: [150, 112, 44], fg: [250, 236, 200] },
    { name: 'PAREJA', plate: 'PAREJA', x: 4.3, w: 3.2, h: 3.2, bg: [138, 70, 92], fg: [248, 232, 236] }
  ];
  const BACK = -6, FRONT = -5.05, TH = 0.12;
  const WOOD = [0.62, 0.4, 0.25], WOOD_D = [0.34, 0.21, 0.13];

  function buildShelf(si) {
    const S = SHELVES[si], cx = S.x, w = S.w, h = S.h;
    const frame = new Group(T.wood);
    const x0 = cx - w / 2, x1 = cx + w / 2;
    box(frame, x0, 0.02, BACK + 0.02, x1, h, BACK + 0.06, WOOD_D, F_FRONT, 0);
    box(frame, x0, 0, BACK + 0.02, x0 + TH, h, FRONT, WOOD, F_ALL ^ F_BACK, 10);
    box(frame, x1 - TH, 0, BACK + 0.02, x1, h, FRONT, WOOD, F_ALL ^ F_BACK, 10);
    const rowH = (h - 4 * TH) / 3;
    for (let k = 0; k < 4; k++) {
      const y = k * (rowH + TH);
      box(frame, x0 + TH, y, BACK + 0.02, x1 - TH, y + TH, FRONT, WOOD, F_ALL ^ F_BACK, 10);
    }
    box(frame, cx - TH / 2, TH, BACK + 0.02, cx + TH / 2, h - TH, FRONT, WOOD, F_ALL ^ F_BACK, 10);
    const plateG = new Group(textTex(S.plate, 64, 16, S.bg, S.fg));
    const px0 = cx - 1.1, px1 = cx + 1.1, py0 = h + 0.14, py1 = h + 0.69;
    const pc = litCol([1, 1, 1], cx, h + 0.4, BACK + 0.2, 1.1);
    quad(plateG, [px0, py1, BACK + 0.2], [px1, py1, BACK + 0.2], [px1, py0, BACK + 0.2], [px0, py0, BACK + 0.2], 0, 0, 64, 16, pc, pc, pc, pc);
    const plateF = new Group(T.wood);
    box(plateF, px0 - 0.06, py0 - 0.06, BACK + 0.02, px1 + 0.06, py1 + 0.06, BACK + 0.19, WOOD_D, F_ALL ^ F_BACK ^ F_FRONT, 10);
    box(plateF, px0 - 0.06, py0 - 0.06, BACK + 0.02, px1 + 0.06, py1 + 0.06, BACK + 0.19, WOOD_D, F_FRONT, 10);
    // the plate quad sits in front of the frame's front face
    const cells = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) {
      const si2 = r * 2 + c, sec = SECTIONS[si2];
      const i = 2 - r;
      const yb = TH + i * (rowH + TH);
      const xa = c === 0 ? x0 + TH : cx + TH / 2;
      const xb = c === 0 ? cx - TH / 2 : x1 - TH;
      const items = new Group(PAT[sec.pat]);
      const rng = rngFrom(si * 977 + si2 * 131 + 7);
      const pal = sec.pal.map(hex);
      let x = xa + 0.05;
      for (let guard = 0; guard < 80; guard++) {
        const iw = sec.wMin + (sec.wMax - sec.wMin) * rng();
        if (x + iw > xb - 0.04) break;
        const ih = (sec.hMin + (sec.hMax - sec.hMin) * rng()) * (rowH - 0.04);
        const zf = FRONT - 0.04 - rng() * 0.07;
        const b = pal[Math.floor(rng() * pal.length)];
        const jit = 0.85 + rng() * 0.3;
        box(items, x, yb, zf - sec.depth, x + iw, yb + ih, zf, [b[0] * jit, b[1] * jit, b[2] * jit], F_FRONT | F_TOP | F_LEFT | F_RIGHT, 0);
        x += iw + 0.012 + (rng() < 0.07 ? 0.1 : 0);
      }
      const cursor = new Group(T.white);
      const t = 0.05, zc0 = FRONT - 0.02, zc1 = FRONT + 0.03, acc = [1.0, 0.8, 0.28];
      box(cursor, xa, yb, zc0, xa + t, yb + rowH, zc1, acc, F_ALL, 0, 1.2);
      box(cursor, xb - t, yb, zc0, xb, yb + rowH, zc1, acc, F_ALL, 0, 1.2);
      box(cursor, xa, yb, zc0, xb, yb + t, zc1, acc, F_ALL, 0, 1.2);
      box(cursor, xa, yb + rowH - t, zc0, xb, yb + rowH, zc1, acc, F_ALL, 0, 1.2);
      cells.push({ label: sec.label, items, cursor });
    }
    return { frame: [frame, plateF], plate: [plateG], cells };
  }

  function buildScene() {
    const statics = [];
    const floor = new Group(T.floor);
    grid(floor, [-7, 0, -6], [14, 0, 0], [0, 0, 10], 14, 10, 16, [1, 1, 1]);
    const wall = new Group(T.wall);
    grid(wall, [-7, 4.6, -6], [14, 0, 0], [0, -4.6, 0], 14, 5, 16, [1, 1, 1]);
    grid(wall, [-7, 4.6, 4], [0, 0, -10], [0, -4.6, 0], 10, 5, 16, [1, 1, 1]);
    grid(wall, [7, 4.6, -6], [0, 0, 10], [0, -4.6, 0], 10, 5, 16, [1, 1, 1]);
    const ceil = new Group(T.wall);
    grid(ceil, [-7, 4.6, -6], [14, 0, 0], [0, 0, 10], 7, 5, 16, [0.7, 0.66, 0.62]);
    const trim = new Group(T.wood);
    box(trim, -7, 0, BACK, 7, 0.28, BACK + 0.1, WOOD_D, F_FRONT | F_TOP, 10);
    box(trim, -7, 0, BACK, -6.9, 0.28, 4, WOOD_D, F_RIGHT | F_TOP, 10);
    box(trim, 6.9, 0, BACK, 7, 0.28, 4, WOOD_D, F_LEFT | F_TOP, 10);
    box(trim, -7, 4.45, BACK, 7, 4.6, BACK + 0.12, WOOD_D, F_FRONT | F_BOTTOM, 10);
    // props
    const rug = new Group(T.rug);
    {
      const c = [1, 1, 1];
      const cc = (x, z) => litCol(c, x, 0.02, z);
      const p = (x, z) => [x, 0.02, z];
      const a = [-3, -4.6], b = [3, -4.6], d = [3, -0.2], e = [-3, -0.2];
      quad(rug, p(a[0], a[1]), p(b[0], b[1]), p(d[0], d[1]), p(e[0], e[1]), 0, 0, 32, 32, cc(a[0], a[1]), cc(b[0], b[1]), cc(d[0], d[1]), cc(e[0], e[1]));
    }
    const props = new Group(T.wood);
    box(props, -1.9, 0, -2.6, -1.0, 0.34, -1.8, [0.3, 0.52, 0.55], F_ALL, 12);
    box(props, 0.7, 0, -2.3, 1.6, 0.3, -1.5, [0.6, 0.3, 0.38], F_ALL, 12);
    box(props, 6.15, 0, -4.85, 6.25, 2.5, -4.75, [0.2, 0.2, 0.22], F_ALL, 12);
    box(props, 5.95, 2.5, -5.05, 6.45, 2.95, -4.55, [1.9, 1.6, 1.0], F_ALL, 12, 0.9);
    box(props, 5.95, 0, -5.05, 6.45, 0.08, -4.55, [0.2, 0.2, 0.22], F_ALL, 12);
    box(props, -6.4, 0, -5.4, -5.9, 0.4, -4.9, [0.45, 0.28, 0.2], F_ALL, 12);
    box(props, -6.55, 0.4, -5.55, -5.75, 1.05, -4.75, [0.25, 0.42, 0.26], F_ALL, 12, 0.9);
    box(props, -6.35, 0.9, -5.35, -5.95, 1.5, -4.95, [0.3, 0.5, 0.3], F_ALL, 12, 0.9);
    box(props, -0.18, 4.0, -1.38, 0.18, 4.45, -1.02, [2.2, 1.9, 1.2], F_ALL, 12, 0.9);
    const post = new Group(T.poster);
    {
      const c = litCol([1, 1, 1], -6.98, 2.8, -2.4, 1);
      quad(post, [-6.97, 3.5, -1.5], [-6.97, 3.5, -3.1], [-6.97, 2.1, -3.1], [-6.97, 2.1, -1.5], 0, 0, 24, 32, c, c, c, c);
      const c2 = litCol([1, 1, 1], 6.98, 2.8, -2.4, 1);
      quad(post, [6.97, 3.5, -3.1], [6.97, 3.5, -1.5], [6.97, 2.1, -1.5], [6.97, 2.1, -3.1], 0, 0, 24, 32, c2, c2, c2, c2);
    }
    statics.push(floor, wall, ceil, trim, rug, props, post);
    const shelves = [buildShelf(0), buildShelf(1), buildShelf(2)];
    return { statics, shelves, sections: SECTIONS.map((s) => s.label), shelfNames: SHELVES.map((s) => s.name), shelfX: SHELVES.map((s) => s.x) };
  }

  // ---------- rasteriser ----------
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const DITH = new Float32Array(16);
  for (let i = 0; i < 16; i++) DITH[i] = (BAYER[i] - 7.5) * 1.5;
  const CAM = { x: 0, y: 0, z: 0, cy: 1, sy: 0, cp: 1, sp: 0 };
  let FB = null, ZB = null;
  const A = new Float64Array(11), B = new Float64Array(11), C = new Float64Array(11);

  function xf(v, o, tint, out) {
    const dx = v[o] - CAM.x, dy = v[o + 1] - CAM.y, dz = v[o + 2] - CAM.z;
    const rx = dx * CAM.cy + dz * CAM.sy, rz = -dx * CAM.sy + dz * CAM.cy;
    const z0 = -rz;
    out[0] = rx; out[1] = dy * CAM.cp + z0 * CAM.sp; out[2] = z0 * CAM.cp - dy * CAM.sp;
    out[3] = v[o + 3]; out[4] = v[o + 4];
    out[5] = v[o + 5] * tint; out[6] = v[o + 6] * tint; out[7] = v[o + 7] * tint;
  }
  function proj(a) {
    const iw = 1 / a[2];
    a[8] = Math.round(W / 2 + a[0] * FOCAL * iw);
    a[9] = Math.round(H / 2 - a[1] * FOCAL * iw);
    a[10] = iw;
  }
  function raster(tex, a, b, c) {
    let ax = a[8], ay = a[9], bx = b[8], by = b[9], cx = c[8], cy = c[9];
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
  function clipDraw(tex, a, b, c) {
    const poly = [a, b, c], out = [];
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
  function drawGroup(g, tint) {
    const v = g.v, n = v.length, tex = g.tex;
    for (let i = 0; i < n; i += 24) {
      xf(v, i, tint, A); xf(v, i + 8, tint, B); xf(v, i + 16, tint, C);
      const ia = A[2] >= NEAR, ib = B[2] >= NEAR, ic = C[2] >= NEAR;
      if (ia && ib && ic) { proj(A); proj(B); proj(C); raster(tex, A, B, C); }
      else if (!ia && !ib && !ic) continue;
      else clipDraw(tex, A, B, C);
    }
  }
  function render(fb, zb, scene, cam, sel) {
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

export { W, H, buildScene, render };
