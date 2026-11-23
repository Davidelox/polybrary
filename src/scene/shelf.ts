import { PAT, T, hex, rngFrom, textTex } from '../engine/textures';
import { F_ALL, F_BACK, F_FRONT, F_LEFT, F_RIGHT, F_TOP, Group, box, litCol, quad } from '../engine/mesh';
import type { ShelfModel } from '../engine/types';
import { BACK, FRONT, SECTIONS, SHELVES, TH, WOOD, WOOD_D } from './config';

export function buildShelf(si: number): ShelfModel {
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
  const cells: ShelfModel['cells'] = [];
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
