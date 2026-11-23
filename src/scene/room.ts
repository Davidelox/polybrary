import { T } from '../engine/textures';
import { F_ALL, F_BOTTOM, F_FRONT, F_LEFT, F_RIGHT, F_TOP, Group, box, grid, litCol, quad } from '../engine/mesh';
import type { Group as GroupT } from '../engine/types';
import { BACK, WOOD_D } from './config';

export function buildRoom(): GroupT[] {
  const statics: GroupT[] = [];
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
    const cc = (x: number, z: number) => litCol(c, x, 0.02, z);
    const p = (x: number, z: number): number[] => [x, 0.02, z];
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
  return statics;
}
