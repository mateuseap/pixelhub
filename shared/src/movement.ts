import { isBoxBlocked } from './collision';
import { PLAYER_HITBOX, PLAYER_SPEED, TILE_SIZE } from './constants';
import type { WorldMap } from './map';
import type { MovementInput, Position } from './types';

/** Longest step the simulation will integrate at once (guards huge dt). */
const MAX_STEP_MS = 250;

interface Direction {
  readonly dx: number;
  readonly dy: number;
}

/** Normalized direction for an input (diagonals are not faster). */
export function directionFor(input: MovementInput): Direction {
  const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
  const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
  if (dx === 0 && dy === 0) {
    return { dx: 0, dy: 0 };
  }
  const len = Math.hypot(dx, dy);
  return { dx: dx / len, dy: dy / len };
}

/**
 * Advances a player one simulation step. Pure: returns a new Position.
 * Axes resolve independently so players slide along walls.
 */
export function stepPlayer(
  map: WorldMap,
  pos: Position,
  input: MovementInput,
  dtMs: number,
): Position {
  const dt = Math.min(Math.max(dtMs, 0), MAX_STEP_MS) / 1000;
  const { dx, dy } = directionFor(input);
  if (dx === 0 && dy === 0) {
    return pos;
  }

  const dist = PLAYER_SPEED * dt;
  const half = PLAYER_HITBOX / 2;
  const maxX = map.width * TILE_SIZE - half;
  const maxY = map.height * TILE_SIZE - half;

  const tryX = Math.min(Math.max(pos.x + dx * dist, half), maxX);
  const x = isBoxBlocked(map, tryX, pos.y, PLAYER_HITBOX) ? pos.x : tryX;

  const tryY = Math.min(Math.max(pos.y + dy * dist, half), maxY);
  const y = isBoxBlocked(map, x, tryY, PLAYER_HITBOX) ? pos.y : tryY;

  return { x, y };
}

/** Coerces an untrusted client payload into a safe MovementInput. */
export function sanitizeInput(raw: unknown): MovementInput {
  const obj = typeof raw === 'object' && raw !== null ? (raw as Record<string, unknown>) : {};
  return {
    up: obj.up === true,
    down: obj.down === true,
    left: obj.left === true,
    right: obj.right === true,
  };
}
