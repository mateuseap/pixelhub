import { PROXIMITY_RADIUS } from './constants';
import { tileDistance } from './proximity';
import type { Position } from './types';

/** Distance (in tiles) up to which a peer is heard at full volume. */
export const FULL_GAIN_RADIUS = 1;

/** A peer that should be audible, with a playback gain in [0, 1]. */
export interface AudioPeer {
  readonly identity: string;
  readonly gain: number;
}

/**
 * Playback gain for a peer at `distanceTiles`: 1.0 from 0 to
 * `fullGainTiles`, then a linear falloff that reaches 0 at `radiusTiles`.
 */
export function audioGainForDistance(
  distanceTiles: number,
  radiusTiles: number = PROXIMITY_RADIUS,
  fullGainTiles: number = FULL_GAIN_RADIUS,
): number {
  if (distanceTiles <= fullGainTiles) {
    return 1;
  }
  if (distanceTiles >= radiusTiles) {
    return 0;
  }
  return (radiusTiles - distanceTiles) / (radiusTiles - fullGainTiles);
}

/**
 * Peers within `radiusTiles` of the listener, each with its distance-based
 * gain. The listener itself (same identity position pair) must not be in
 * `peers`; callers filter it out. Pure: safe to run on client or server.
 */
export function computeAudioPeers(
  listener: Position,
  peers: ReadonlyArray<readonly [string, Position]>,
  radiusTiles: number = PROXIMITY_RADIUS,
): readonly AudioPeer[] {
  return peers
    .map(([identity, pos]) => ({
      identity,
      gain: audioGainForDistance(tileDistance(listener, pos), radiusTiles),
    }))
    .filter((peer) => peer.gain > 0);
}
