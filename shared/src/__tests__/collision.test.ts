import { describe, expect, it } from 'vitest';
import { isBoxBlocked } from '../collision';
import { PLAYER_HITBOX, TILE_SIZE } from '../constants';
import { createWorldMap } from '../map';

describe('isBoxBlocked', () => {
  const map = createWorldMap();

  it('is free in open floor', () => {
    // Spawn (20, 10) is guaranteed floor; center of that tile.
    const cx = 20 * TILE_SIZE + TILE_SIZE / 2;
    const cy = 10 * TILE_SIZE + TILE_SIZE / 2;
    expect(isBoxBlocked(map, cx, cy, PLAYER_HITBOX)).toBe(false);
  });

  it('is blocked inside a border wall', () => {
    expect(isBoxBlocked(map, TILE_SIZE / 2, TILE_SIZE / 2, PLAYER_HITBOX)).toBe(true);
  });

  it('is blocked when the box overlaps a wall edge', () => {
    // Box centered just inside the left border wall's boundary.
    const cx = TILE_SIZE + PLAYER_HITBOX / 2 - 2;
    const cy = 10 * TILE_SIZE + TILE_SIZE / 2;
    expect(isBoxBlocked(map, cx, cy, PLAYER_HITBOX)).toBe(true);
  });

  it('is free when the box is flush against a wall', () => {
    const cx = TILE_SIZE + PLAYER_HITBOX / 2;
    const cy = 10 * TILE_SIZE + TILE_SIZE / 2;
    expect(isBoxBlocked(map, cx, cy, PLAYER_HITBOX)).toBe(false);
  });

  it('is blocked outside the world', () => {
    expect(isBoxBlocked(map, -100, -100, PLAYER_HITBOX)).toBe(true);
  });
});
