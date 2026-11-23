import type { Scene } from '../engine/types';
import { SECTIONS, SHELVES } from './config';
import { buildRoom } from './room';
import { buildShelf } from './shelf';

export function buildScene(): Scene {
  const statics = buildRoom();
  const shelves = [buildShelf(0), buildShelf(1), buildShelf(2)];
  return { statics, shelves, sections: SECTIONS.map((s) => s.label), shelfNames: SHELVES.map((s) => s.name), shelfX: SHELVES.map((s) => s.x) };
}
