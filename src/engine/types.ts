export interface Texture {
  w: number;
  h: number;
  d: Uint8ClampedArray;
  mw: number;
  mh: number;
}

export type Vec3 = number[];

export interface Camera {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
}

export interface Selection {
  overview: boolean;
  shelf: number;
  cell: number;
  t: number;
}

/** Lista plana de vértices (8 números por vértice: x, y, z, u, v, r, g, b) con una textura. */
export interface Group {
  tex: Texture;
  v: number[];
}

export interface Cell {
  label: string;
  items: Group;
  cursor: Group;
}

export interface ShelfModel {
  frame: Group[];
  plate: Group[];
  cells: Cell[];
}

export interface Scene {
  statics: Group[];
  shelves: ShelfModel[];
  sections: string[];
  shelfNames: string[];
  shelfX: number[];
}
