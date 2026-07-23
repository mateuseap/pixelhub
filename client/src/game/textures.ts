import Phaser from 'phaser';
import { TILE_SIZE, isWalkable, type WorldMap } from '@pixelhub/shared';

export const TEXTURE_WORLD = 'world-map';
export const TEXTURE_AVATAR_BODY_0 = 'avatar-body-0';
export const TEXTURE_AVATAR_BODY_1 = 'avatar-body-1';
export const TEXTURE_AVATAR_HEAD = 'avatar-head';
export const TEXTURE_AVATAR_SHADOW = 'avatar-shadow';

/**
 * Cohesive warm palette for the whole world: plum walls, wood floors,
 * amber and teal accents. Every texture below draws only from this set.
 */
export const PALETTE = {
  void: 0x17131d,
  ink: 0x2a2233,
  wallTop: 0x6d5d7d,
  wallFace: 0x51445e,
  wallEdge: 0x3a3145,
  floorA: 0x8c6a4f,
  floorB: 0x84634a,
  floorSpeck: 0x96755a,
  rugRed: 0xa8545c,
  rugRedDark: 0x8f434b,
  rugTeal: 0x4f7d74,
  rugTealDark: 0x416a62,
  wood: 0xb08968,
  woodLight: 0xc9a880,
  woodDark: 0x8a6448,
  leaf: 0x6fa864,
  leafDark: 0x4c7d49,
  pot: 0xa06a48,
  potDark: 0x84543a,
  skin: 0xf2c9a2,
  hair: 0x4a3628,
  paper: 0xefe6d2,
} as const;

interface TileRect {
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/**
 * Visual dressing for obstacle tiles from the shared map. Collision always
 * comes from @pixelhub/shared; these rects only choose how blocked tiles are
 * painted (desk, table, plant, planter) instead of a bare wall.
 */
const DESKS: readonly TileRect[] = [
  { x: 16, y: 6, w: 10, h: 1 },
  { x: 33, y: 15, w: 2, h: 1 },
];
const TABLES: readonly TileRect[] = [{ x: 18, y: 13, w: 4, h: 4 }];
const PLANTERS: readonly TileRect[] = [
  { x: 31, y: 5, w: 2, h: 2 },
  { x: 35, y: 9, w: 2, h: 2 },
];
const PLANTS: readonly (readonly [number, number])[] = [
  [13, 10],
  [25, 16],
];

/** Walkable rug areas, purely decorative. */
const RUGS: readonly (TileRect & { readonly color: number; readonly border: number })[] = [
  { x: 17, y: 18, w: 6, h: 3, color: PALETTE.rugRed, border: PALETTE.rugRedDark },
  { x: 8, y: 21, w: 4, h: 3, color: PALETTE.rugTeal, border: PALETTE.rugTealDark },
  { x: 30, y: 10, w: 4, h: 2, color: PALETTE.rugTeal, border: PALETTE.rugTealDark },
];

const inRect = (r: TileRect, tx: number, ty: number): boolean =>
  tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h;

/** Deterministic per-tile hash for subtle variation (no RNG, stable output). */
const tileHash = (tx: number, ty: number): number => {
  let h = (tx * 73856093) ^ (ty * 19349663);
  h = (h ^ (h >>> 13)) >>> 0;
  return h;
};

/** Draws a character map where each char maps to a palette color. */
function drawPixelMap(
  g: Phaser.GameObjects.Graphics,
  rows: readonly string[],
  colors: Readonly<Record<string, number>>,
  ox: number,
  oy: number,
  unit: number,
): void {
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      const color = colors[row[x]];
      if (color !== undefined) {
        g.fillStyle(color, 1);
        g.fillRect(ox + x * unit, oy + y * unit, unit, unit);
      }
    }
  });
}

function drawFloorTile(g: Phaser.GameObjects.Graphics, tx: number, ty: number): void {
  const px = tx * TILE_SIZE;
  const py = ty * TILE_SIZE;
  const checker = (tx + ty) % 2 === 0;
  g.fillStyle(checker ? PALETTE.floorA : PALETTE.floorB, 1);
  g.fillRect(px, py, TILE_SIZE, TILE_SIZE);

  // Sparse speckles sell the wood grain without visual noise.
  const h = tileHash(tx, ty);
  if (h % 3 === 0) {
    g.fillStyle(PALETTE.floorSpeck, 1);
    g.fillRect(px + 4 + (h % 5) * 4, py + 6 + ((h >>> 3) % 4) * 5, 4, 2);
    g.fillRect(px + 8 + ((h >>> 5) % 4) * 4, py + 18 + ((h >>> 7) % 3) * 3, 3, 2);
  }
  // Faint plank seams every other row.
  if (ty % 2 === 0) {
    g.fillStyle(PALETTE.floorB, checker ? 1 : 0);
    g.fillRect(px, py, TILE_SIZE, 1);
  }
}

function drawRug(g: Phaser.GameObjects.Graphics, rug: (typeof RUGS)[number]): void {
  const px = rug.x * TILE_SIZE;
  const py = rug.y * TILE_SIZE;
  const w = rug.w * TILE_SIZE;
  const h = rug.h * TILE_SIZE;
  g.fillStyle(rug.border, 1);
  g.fillRect(px + 2, py + 2, w - 4, h - 4);
  g.fillStyle(rug.color, 1);
  g.fillRect(px + 6, py + 6, w - 12, h - 12);
  // Simple woven pattern: border dots along the inner edge.
  g.fillStyle(rug.border, 1);
  for (let x = px + 10; x < px + w - 10; x += 8) {
    g.fillRect(x, py + 8, 3, 3);
    g.fillRect(x, py + h - 11, 3, 3);
  }
}

function drawWallTile(
  g: Phaser.GameObjects.Graphics,
  map: WorldMap,
  tx: number,
  ty: number,
): void {
  const px = tx * TILE_SIZE;
  const py = ty * TILE_SIZE;
  const southOpen = isWalkable(map, tx, ty + 1);
  const northOpen = isWalkable(map, tx, ty - 1);
  const westOpen = isWalkable(map, tx - 1, ty);
  const eastOpen = isWalkable(map, tx + 1, ty);

  g.fillStyle(PALETTE.wallTop, 1);
  g.fillRect(px, py, TILE_SIZE, TILE_SIZE);

  if (southOpen) {
    // South-facing side: visible front face with a dark base line.
    g.fillStyle(PALETTE.wallFace, 1);
    g.fillRect(px, py + 18, TILE_SIZE, 14);
    g.fillStyle(PALETTE.wallEdge, 1);
    g.fillRect(px, py + 29, TILE_SIZE, 3);
    // A few brick seams on the face.
    g.fillRect(px + 8, py + 22, 2, 4);
    g.fillRect(px + 22, py + 24, 2, 4);
  }
  // Dark outline wherever the wall meets open floor.
  g.fillStyle(PALETTE.wallEdge, 1);
  if (northOpen) {
    g.fillRect(px, py, TILE_SIZE, 2);
  }
  if (westOpen) {
    g.fillRect(px, py, 2, TILE_SIZE);
  }
  if (eastOpen) {
    g.fillRect(px + TILE_SIZE - 2, py, 2, TILE_SIZE);
  }
  // Occasional top texture flecks.
  const h = tileHash(tx, ty);
  if (h % 4 === 0) {
    g.fillStyle(PALETTE.wallEdge, 1);
    g.fillRect(px + 6 + (h % 4) * 5, py + 5 + ((h >>> 4) % 3) * 4, 3, 2);
  }
}

function drawDesk(g: Phaser.GameObjects.Graphics, rect: TileRect): void {
  const px = rect.x * TILE_SIZE;
  const py = rect.y * TILE_SIZE;
  const w = rect.w * TILE_SIZE;
  const h = rect.h * TILE_SIZE;
  g.fillStyle(PALETTE.woodDark, 1);
  g.fillRect(px, py, w, h);
  g.fillStyle(PALETTE.woodLight, 1);
  g.fillRect(px + 2, py + 2, w - 4, h - 12);
  g.fillStyle(PALETTE.wood, 1);
  g.fillRect(px + 2, py + h - 10, w - 4, 8);
  // Scattered papers on the surface.
  for (let tx = rect.x; tx < rect.x + rect.w; tx += 1) {
    const hh = tileHash(tx, rect.y);
    if (hh % 3 === 0) {
      g.fillStyle(PALETTE.paper, 1);
      g.fillRect(tx * TILE_SIZE + 8, py + 6, 12, 9);
      g.fillStyle(PALETTE.woodDark, 1);
      g.fillRect(tx * TILE_SIZE + 10, py + 9, 8, 1);
      g.fillRect(tx * TILE_SIZE + 10, py + 12, 6, 1);
    }
  }
}

function drawTable(g: Phaser.GameObjects.Graphics, rect: TileRect): void {
  const px = rect.x * TILE_SIZE;
  const py = rect.y * TILE_SIZE;
  const w = rect.w * TILE_SIZE;
  const h = rect.h * TILE_SIZE;
  g.fillStyle(PALETTE.woodDark, 1);
  g.fillRect(px, py, w, h);
  g.fillStyle(PALETTE.woodLight, 1);
  g.fillRect(px + 4, py + 4, w - 8, h - 16);
  g.fillStyle(PALETTE.wood, 1);
  g.fillRect(px + 4, py + h - 12, w - 8, 8);
  // Table setting: two papers and a small centerpiece plant.
  g.fillStyle(PALETTE.paper, 1);
  g.fillRect(px + 16, py + 14, 14, 10);
  g.fillRect(px + w - 34, py + h - 40, 14, 10);
  g.fillStyle(PALETTE.pot, 1);
  g.fillRect(px + w / 2 - 5, py + h / 2 - 2, 10, 8);
  g.fillStyle(PALETTE.leaf, 1);
  g.fillRect(px + w / 2 - 7, py + h / 2 - 10, 14, 8);
  g.fillStyle(PALETTE.leafDark, 1);
  g.fillRect(px + w / 2 - 3, py + h / 2 - 8, 4, 4);
}

function drawPlanter(g: Phaser.GameObjects.Graphics, rect: TileRect): void {
  const px = rect.x * TILE_SIZE;
  const py = rect.y * TILE_SIZE;
  const w = rect.w * TILE_SIZE;
  const h = rect.h * TILE_SIZE;
  g.fillStyle(PALETTE.woodDark, 1);
  g.fillRect(px, py, w, h);
  g.fillStyle(PALETTE.wood, 1);
  g.fillRect(px + 2, py + 2, w - 4, h - 4);
  g.fillStyle(PALETTE.leafDark, 1);
  g.fillRect(px + 6, py + 6, w - 12, h - 12);
  // Leafy tufts with deterministic placement.
  g.fillStyle(PALETTE.leaf, 1);
  for (let i = 0; i < 7; i += 1) {
    const hh = tileHash(rect.x * 31 + i, rect.y * 17 + i * 3);
    g.fillRect(px + 8 + (hh % (w - 26)), py + 8 + ((hh >>> 6) % (h - 25)), 6, 5);
  }
}

const PLANT_MAP: readonly string[] = [
  '..llll..',
  '.llllll.',
  'llllllll',
  'lLllllLl',
  'llllLlll',
  '.llllll.',
  '..pppp..',
  '.pPPPPp.',
  '.pppppp.',
  '..pppp..',
];
const PLANT_COLORS: Readonly<Record<string, number>> = {
  l: PALETTE.leaf,
  L: PALETTE.leafDark,
  p: PALETTE.pot,
  P: PALETTE.potDark,
};

function drawPlant(g: Phaser.GameObjects.Graphics, tx: number, ty: number): void {
  // Unit 3 makes a 24x30 sprite: the foliage pokes into the tile above.
  const px = tx * TILE_SIZE + 4;
  const py = ty * TILE_SIZE + TILE_SIZE - 30;
  drawPixelMap(g, PLANT_MAP, PLANT_COLORS, px, py, 3);
}

/**
 * Bakes the whole tile map into one static texture (a single draw call at
 * runtime). Everything is generated: no image files are loaded, ever.
 */
export function createWorldTexture(scene: Phaser.Scene, map: WorldMap): void {
  if (scene.textures.exists(TEXTURE_WORLD)) {
    return;
  }
  const g = scene.add.graphics();

  for (let ty = 0; ty < map.height; ty += 1) {
    for (let tx = 0; tx < map.width; tx += 1) {
      if (isWalkable(map, tx, ty)) {
        drawFloorTile(g, tx, ty);
      }
    }
  }
  RUGS.forEach((rug) => drawRug(g, rug));

  // Soft shadow on floor tiles directly south of any blocked tile.
  for (let ty = 0; ty < map.height; ty += 1) {
    for (let tx = 0; tx < map.width; tx += 1) {
      if (isWalkable(map, tx, ty) && !isWalkable(map, tx, ty - 1)) {
        g.fillStyle(PALETTE.ink, 0.18);
        g.fillRect(tx * TILE_SIZE, ty * TILE_SIZE, TILE_SIZE, 8);
      }
    }
  }

  for (let ty = 0; ty < map.height; ty += 1) {
    for (let tx = 0; tx < map.width; tx += 1) {
      if (isWalkable(map, tx, ty)) {
        continue;
      }
      if (DESKS.some((r) => inRect(r, tx, ty)) || TABLES.some((r) => inRect(r, tx, ty))) {
        continue; // Painted as a whole rect below.
      }
      if (PLANTERS.some((r) => inRect(r, tx, ty))) {
        continue;
      }
      if (PLANTS.some(([x, y]) => x === tx && y === ty)) {
        // Floor shows beneath the pot.
        drawFloorTile(g, tx, ty);
        continue;
      }
      drawWallTile(g, map, tx, ty);
    }
  }

  DESKS.forEach((r) => drawDesk(g, r));
  TABLES.forEach((r) => drawTable(g, r));
  PLANTERS.forEach((r) => drawPlanter(g, r));
  PLANTS.forEach(([tx, ty]) => drawPlant(g, tx, ty));

  g.generateTexture(TEXTURE_WORLD, map.width * TILE_SIZE, map.height * TILE_SIZE);
  g.destroy();
}

// Avatar pixel maps. Body is drawn in white so per-player tint colors it;
// shoes are dark and survive tint multiplication.
const BODY_FRAME_0: readonly string[] = [
  '..bbbbbbbb..',
  '.bbbbbbbbbb.',
  '.bbbbbbbbbb.',
  '.bbbbbbbbbb.',
  '..bbbbbbbb..',
  '...bb..bb...',
  '...bb..bb...',
  '...dd..dd...',
];
const BODY_FRAME_1: readonly string[] = [
  '..bbbbbbbb..',
  '.bbbbbbbbbb.',
  '.bbbbbbbbbb.',
  '.bbbbbbbbbb.',
  '..bbbbbbbb..',
  '..bb....bb..',
  '..bb....bb..',
  '..dd....dd..',
];
const BODY_COLORS: Readonly<Record<string, number>> = {
  b: 0xffffff,
  d: PALETTE.ink,
};

const HEAD_MAP: readonly string[] = [
  '..hhhhhh..',
  '.hhhhhhhh.',
  '.hsssssss.',
  '.hsessseh.',
  '.ssssssss.',
  '..ssssss..',
];
const HEAD_COLORS: Readonly<Record<string, number>> = {
  h: PALETTE.hair,
  s: PALETTE.skin,
  e: PALETTE.ink,
};

/** Generates all avatar part textures once (body frames, head, shadow). */
export function createAvatarTextures(scene: Phaser.Scene): void {
  if (scene.textures.exists(TEXTURE_AVATAR_HEAD)) {
    return;
  }
  const unit = 2;

  const body0 = scene.add.graphics();
  drawPixelMap(body0, BODY_FRAME_0, BODY_COLORS, 0, 0, unit);
  body0.generateTexture(TEXTURE_AVATAR_BODY_0, 12 * unit, 8 * unit);
  body0.destroy();

  const body1 = scene.add.graphics();
  drawPixelMap(body1, BODY_FRAME_1, BODY_COLORS, 0, 0, unit);
  body1.generateTexture(TEXTURE_AVATAR_BODY_1, 12 * unit, 8 * unit);
  body1.destroy();

  const head = scene.add.graphics();
  drawPixelMap(head, HEAD_MAP, HEAD_COLORS, 0, 0, unit);
  head.generateTexture(TEXTURE_AVATAR_HEAD, 10 * unit, 6 * unit);
  head.destroy();

  const shadow = scene.add.graphics();
  shadow.fillStyle(0x000000, 1);
  shadow.fillEllipse(10, 4, 20, 8);
  shadow.generateTexture(TEXTURE_AVATAR_SHADOW, 20, 8);
  shadow.destroy();
}
