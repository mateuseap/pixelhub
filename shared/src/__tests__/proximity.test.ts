import { describe, expect, it } from 'vitest';
import { PROXIMITY_RADIUS, TILE_SIZE } from '../constants';
import { filterChatRecipients, isWithinProximity, tileDistance } from '../proximity';

describe('tileDistance', () => {
  it('is zero for the same point', () => {
    expect(tileDistance({ x: 100, y: 100 }, { x: 100, y: 100 })).toBe(0);
  });

  it('converts pixels to tiles', () => {
    expect(tileDistance({ x: 0, y: 0 }, { x: 3 * TILE_SIZE, y: 4 * TILE_SIZE })).toBeCloseTo(5);
  });
});

describe('isWithinProximity', () => {
  const origin = { x: 0, y: 0 };

  it('is true exactly at the radius', () => {
    expect(isWithinProximity(origin, { x: PROXIMITY_RADIUS * TILE_SIZE, y: 0 })).toBe(true);
  });

  it('is false just past the radius', () => {
    expect(isWithinProximity(origin, { x: PROXIMITY_RADIUS * TILE_SIZE + 1, y: 0 })).toBe(false);
  });
});

describe('filterChatRecipients', () => {
  const sender = { x: 10 * TILE_SIZE, y: 10 * TILE_SIZE };
  const players: ReadonlyArray<readonly [string, { x: number; y: number }]> = [
    ['sender', sender],
    ['near', { x: 12 * TILE_SIZE, y: 10 * TILE_SIZE }],
    ['edge', { x: 15 * TILE_SIZE, y: 10 * TILE_SIZE }],
    ['far', { x: 30 * TILE_SIZE, y: 10 * TILE_SIZE }],
  ];

  it('includes the sender and everyone within the radius', () => {
    expect(filterChatRecipients(sender, players)).toEqual(['sender', 'near', 'edge']);
  });

  it('excludes players outside the radius', () => {
    expect(filterChatRecipients(sender, players)).not.toContain('far');
  });

  it('handles an empty roster', () => {
    expect(filterChatRecipients(sender, [])).toEqual([]);
  });

  it('respects a custom radius', () => {
    expect(filterChatRecipients(sender, players, 1)).toEqual(['sender']);
  });
});
