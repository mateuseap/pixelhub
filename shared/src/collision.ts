import { TILE_SIZE } from './constants';
import { isWalkable, type WorldMap } from './map';

/**
 * True when a square hitbox centered at (cx, cy) with side `size` (pixels)
 * overlaps any non-walkable tile.
 */
export function isBoxBlocked(map: WorldMap, cx: number, cy: number, size: number): boolean {
  const half = size / 2;
  // Epsilon keeps a box flush against a wall from registering as inside it.
  const eps = 0.001;
  const minTx = Math.floor((cx - half + eps) / TILE_SIZE);
  const maxTx = Math.floor((cx + half - eps) / TILE_SIZE);
  const minTy = Math.floor((cy - half + eps) / TILE_SIZE);
  const maxTy = Math.floor((cy + half - eps) / TILE_SIZE);

  for (let ty = minTy; ty <= maxTy; ty += 1) {
    for (let tx = minTx; tx <= maxTx; tx += 1) {
      if (!isWalkable(map, tx, ty)) {
        return true;
      }
    }
  }
  return false;
}
