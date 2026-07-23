import Phaser from 'phaser';
import { TILE_SIZE, createWorldMap, isWalkable } from '@pixelhub/shared';

export const TEXTURE_WORLD = 'world-map';
export const TEXTURE_AVATAR = 'avatar';

const FLOOR_COLOR = 0x353a50;
const FLOOR_GRID = 0x3d4360;
const WALL_COLOR = 0x22243a;
const WALL_TOP = 0x2c2f4a;

/**
 * Renders the whole tile map into a single generated texture. No external
 * assets: everything is drawn with Phaser Graphics.
 */
export function createWorldTexture(scene: Phaser.Scene): void {
  const map = createWorldMap();
  const g = scene.add.graphics();

  for (let ty = 0; ty < map.height; ty += 1) {
    for (let tx = 0; tx < map.width; tx += 1) {
      const px = tx * TILE_SIZE;
      const py = ty * TILE_SIZE;
      if (isWalkable(map, tx, ty)) {
        g.fillStyle(FLOOR_COLOR, 1);
        g.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        g.lineStyle(1, FLOOR_GRID, 0.6);
        g.strokeRect(px + 0.5, py + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
      } else {
        g.fillStyle(WALL_COLOR, 1);
        g.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        g.fillStyle(WALL_TOP, 1);
        g.fillRect(px, py, TILE_SIZE, 6);
      }
    }
  }

  g.generateTexture(TEXTURE_WORLD, map.width * TILE_SIZE, map.height * TILE_SIZE);
  g.destroy();
}

/**
 * Generates a white avatar texture (body + face) that is tinted per player,
 * so each player gets a distinct color without any downloaded sprite sheets.
 */
export function createAvatarTexture(scene: Phaser.Scene): void {
  const size = 28;
  const g = scene.add.graphics();

  // Body: white so tint applies cleanly.
  g.fillStyle(0xffffff, 1);
  g.fillCircle(size / 2, size / 2, size / 2 - 1);
  // Face: dark eyes survive tint multiplication.
  g.fillStyle(0x1c1e2c, 1);
  g.fillCircle(size / 2 - 5, size / 2 - 3, 2.4);
  g.fillCircle(size / 2 + 5, size / 2 - 3, 2.4);
  g.fillRect(size / 2 - 4, size / 2 + 5, 8, 2);

  g.generateTexture(TEXTURE_AVATAR, size, size);
  g.destroy();
}
