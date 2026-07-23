/** Size of one tile, in pixels. */
export const TILE_SIZE = 32;

/** World dimensions, in tiles. */
export const MAP_WIDTH = 40;
export const MAP_HEIGHT = 30;

/** Server simulation rate (ticks per second). */
export const TICK_RATE = 20;

/** Player movement speed, in pixels per second. */
export const PLAYER_SPEED = 160;

/** Square hitbox side used for collision, in pixels (smaller than a tile). */
export const PLAYER_HITBOX = 24;

/** Chat/audio proximity radius, in tiles. */
export const PROXIMITY_RADIUS = 5;

/** Display-name constraints. */
export const MIN_NAME_LENGTH = 1;
export const MAX_NAME_LENGTH = 20;

/** Chat message constraints. */
export const MAX_MESSAGE_LENGTH = 500;

/** Chat rate limit: at most CHAT_RATE_MAX messages per CHAT_RATE_WINDOW_MS. */
export const CHAT_RATE_MAX = 5;
export const CHAT_RATE_WINDOW_MS = 5000;

/** Colyseus room name and same-origin endpoint path. */
export const ROOM_NAME = 'world';
export const COLYSEUS_PATH = '/colyseus';

/** Default server port. */
export const DEFAULT_PORT = 2567;

/** Maximum clients per room (host is a 1 vCPU VPS). */
export const MAX_CLIENTS = 16;

/** Distinct avatar colors, assigned round-robin on join. */
export const PLAYER_COLORS: readonly string[] = [
  '#e06c75',
  '#61afef',
  '#98c379',
  '#e5c07b',
  '#c678dd',
  '#56b6c2',
  '#d19a66',
  '#ff79c6',
  '#50fa7b',
  '#8be9fd',
  '#f1fa8c',
  '#bd93f9',
];
