import { describe, expect, it } from 'vitest';
import { PROXIMITY_RADIUS, TILE_SIZE } from '../constants';
import { audioGainForDistance, computeAudioPeers } from '../proximityAudio';
import type { Position } from '../types';

const at = (tx: number, ty: number): Position => ({ x: tx * TILE_SIZE, y: ty * TILE_SIZE });

describe('audioGainForDistance', () => {
  it('is 1.0 at distance 0', () => {
    expect(audioGainForDistance(0)).toBe(1);
  });

  it('is 1.0 anywhere inside the full-gain radius (0 to 1 tiles)', () => {
    expect(audioGainForDistance(0.5)).toBe(1);
    expect(audioGainForDistance(1)).toBe(1);
  });

  it('is 0 at the proximity radius edge and beyond', () => {
    expect(audioGainForDistance(PROXIMITY_RADIUS)).toBe(0);
    expect(audioGainForDistance(PROXIMITY_RADIUS + 3)).toBe(0);
  });

  it('falls off linearly between 1 tile and the radius edge', () => {
    const mid = (1 + PROXIMITY_RADIUS) / 2;
    expect(audioGainForDistance(mid)).toBeCloseTo(0.5, 10);

    const quarter = 1 + (PROXIMITY_RADIUS - 1) * 0.25;
    expect(audioGainForDistance(quarter)).toBeCloseTo(0.75, 10);
  });

  it('is monotonically non-increasing with distance', () => {
    let previous = Number.POSITIVE_INFINITY;
    for (let d = 0; d <= PROXIMITY_RADIUS + 1; d += 0.1) {
      const gain = audioGainForDistance(d);
      expect(gain).toBeLessThanOrEqual(previous);
      expect(gain).toBeGreaterThanOrEqual(0);
      expect(gain).toBeLessThanOrEqual(1);
      previous = gain;
    }
  });

  it('respects a custom radius', () => {
    expect(audioGainForDistance(5, 10)).toBeCloseTo(5 / 9, 10);
    expect(audioGainForDistance(10, 10)).toBe(0);
  });
});

describe('computeAudioPeers', () => {
  it('returns an empty set when nobody else is around', () => {
    expect(computeAudioPeers(at(10, 10), [])).toEqual([]);
  });

  it('includes only peers strictly within the proximity radius', () => {
    const listener = at(10, 10);
    const peers = computeAudioPeers(listener, [
      ['near', at(12, 10)],
      ['edge', at(10 + PROXIMITY_RADIUS, 10)],
      ['far', at(30, 25)],
    ]);
    expect(peers.map((p) => p.identity)).toEqual(['near']);
  });

  it('assigns full gain to adjacent peers and partial gain farther out', () => {
    const listener = at(10, 10);
    const peers = computeAudioPeers(listener, [
      ['adjacent', at(11, 10)],
      ['midway', at(13, 10)],
    ]);

    const adjacent = peers.find((p) => p.identity === 'adjacent');
    const midway = peers.find((p) => p.identity === 'midway');
    expect(adjacent?.gain).toBe(1);
    // 3 tiles away with radius 5: (5 - 3) / (5 - 1) = 0.5.
    expect(midway?.gain).toBeCloseTo(0.5, 10);
  });

  it('uses euclidean distance, not per-axis distance', () => {
    const listener = at(10, 10);
    // 4 tiles right + 4 tiles down = ~5.66 tiles: out of range.
    const peers = computeAudioPeers(listener, [['diagonal', at(14, 14)]]);
    expect(peers).toEqual([]);
  });

  it('does not mutate the input roster', () => {
    const roster: (readonly [string, Position])[] = [['a', at(11, 10)]];
    const snapshot = JSON.stringify(roster);
    computeAudioPeers(at(10, 10), roster);
    expect(JSON.stringify(roster)).toBe(snapshot);
  });
});
