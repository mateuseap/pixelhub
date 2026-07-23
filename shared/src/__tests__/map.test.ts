import { describe, expect, it } from 'vitest';
import { MAP_HEIGHT, MAP_WIDTH } from '../constants';
import { SPAWN_POINTS, TILE_WALL, createWorldMap, isWalkable, tileAt } from '../map';

describe('createWorldMap', () => {
  const map = createWorldMap();

  it('has the expected dimensions', () => {
    expect(map.width).toBe(MAP_WIDTH);
    expect(map.height).toBe(MAP_HEIGHT);
    expect(map.tiles).toHaveLength(MAP_WIDTH * MAP_HEIGHT);
  });

  it('is fully walled at the borders', () => {
    for (let x = 0; x < map.width; x += 1) {
      expect(tileAt(map, x, 0)).toBe(TILE_WALL);
      expect(tileAt(map, x, map.height - 1)).toBe(TILE_WALL);
    }
    for (let y = 0; y < map.height; y += 1) {
      expect(tileAt(map, 0, y)).toBe(TILE_WALL);
      expect(tileAt(map, map.width - 1, y)).toBe(TILE_WALL);
    }
  });

  it('contains interior obstacles', () => {
    const interior = map.tiles.filter((_, i) => {
      const x = i % map.width;
      const y = Math.floor(i / map.width);
      return x > 0 && y > 0 && x < map.width - 1 && y < map.height - 1;
    });
    expect(interior.some((t) => t === TILE_WALL)).toBe(true);
  });

  it('keeps every spawn point walkable', () => {
    for (const [tx, ty] of SPAWN_POINTS) {
      expect(isWalkable(map, tx, ty)).toBe(true);
    }
  });

  it('treats out-of-bounds tiles as walls', () => {
    expect(tileAt(map, -1, 5)).toBe(TILE_WALL);
    expect(tileAt(map, 5, -1)).toBe(TILE_WALL);
    expect(tileAt(map, map.width, 5)).toBe(TILE_WALL);
    expect(tileAt(map, 5, map.height)).toBe(TILE_WALL);
  });

  it('is deterministic', () => {
    expect(createWorldMap()).toEqual(map);
  });
});
