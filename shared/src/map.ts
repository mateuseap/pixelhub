import { MAP_HEIGHT, MAP_WIDTH } from './constants';

export const TILE_FLOOR = 0;
export const TILE_WALL = 1;

/** Immutable tile world: `tiles[y * width + x]` is TILE_FLOOR or TILE_WALL. */
export interface WorldMap {
  readonly width: number;
  readonly height: number;
  readonly tiles: readonly number[];
}

interface Rect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/** Interior obstacles (tile coords). Kept away from SPAWN_POINTS. */
const OBSTACLES: readonly Rect[] = [
  // Meeting nook, top-left
  { x: 5, y: 4, w: 7, h: 1 },
  { x: 5, y: 4, w: 1, h: 5 },
  // Long divider through the upper middle
  { x: 16, y: 6, w: 10, h: 1 },
  // Twin pillars, top-right
  { x: 31, y: 5, w: 2, h: 2 },
  { x: 35, y: 9, w: 2, h: 2 },
  // Central block
  { x: 18, y: 13, w: 4, h: 4 },
  // Lounge walls, bottom-left
  { x: 6, y: 20, w: 1, h: 6 },
  { x: 6, y: 25, w: 7, h: 1 },
  // Bottom-right room
  { x: 28, y: 20, w: 8, h: 1 },
  { x: 28, y: 20, w: 1, h: 6 },
  // Scattered pillars
  { x: 13, y: 10, w: 1, h: 1 },
  { x: 25, y: 16, w: 1, h: 1 },
  { x: 33, y: 15, w: 2, h: 1 },
];

/** Guaranteed-walkable spawn tiles, used round-robin on join. */
export const SPAWN_POINTS: readonly (readonly [number, number])[] = [
  [20, 10],
  [15, 18],
  [24, 18],
  [10, 14],
  [30, 12],
  [20, 22],
  [14, 6],
  [27, 8],
];

const inRect = (r: Rect, x: number, y: number): boolean =>
  x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;

/** Builds the fixed 40x30 world. Deterministic and side-effect free. */
export function createWorldMap(): WorldMap {
  const tiles = Array.from({ length: MAP_WIDTH * MAP_HEIGHT }, (_, i) => {
    const x = i % MAP_WIDTH;
    const y = Math.floor(i / MAP_WIDTH);
    const border = x === 0 || y === 0 || x === MAP_WIDTH - 1 || y === MAP_HEIGHT - 1;
    const blocked = border || OBSTACLES.some((r) => inRect(r, x, y));
    return blocked ? TILE_WALL : TILE_FLOOR;
  });
  return { width: MAP_WIDTH, height: MAP_HEIGHT, tiles };
}

/** Tile at (tx, ty); out-of-bounds counts as wall. */
export function tileAt(map: WorldMap, tx: number, ty: number): number {
  if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) {
    return TILE_WALL;
  }
  return map.tiles[ty * map.width + tx];
}

export function isWalkable(map: WorldMap, tx: number, ty: number): boolean {
  return tileAt(map, tx, ty) === TILE_FLOOR;
}
