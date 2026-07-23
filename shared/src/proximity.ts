import { PROXIMITY_RADIUS, TILE_SIZE } from './constants';
import type { Position } from './types';

/** Euclidean distance between two pixel positions, expressed in tiles. */
export function tileDistance(a: Position, b: Position): number {
  return Math.hypot(a.x - b.x, a.y - b.y) / TILE_SIZE;
}

/** True when two players are close enough to chat (and, later, hear each other). */
export function isWithinProximity(
  a: Position,
  b: Position,
  radiusTiles: number = PROXIMITY_RADIUS,
): boolean {
  return tileDistance(a, b) <= radiusTiles;
}

/**
 * Ids of every player within `radiusTiles` of the sender (the sender itself
 * qualifies at distance 0). Used server-side to filter chat recipients.
 */
export function filterChatRecipients(
  senderPos: Position,
  players: ReadonlyArray<readonly [string, Position]>,
  radiusTiles: number = PROXIMITY_RADIUS,
): readonly string[] {
  return players
    .filter(([, pos]) => isWithinProximity(senderPos, pos, radiusTiles))
    .map(([id]) => id);
}
