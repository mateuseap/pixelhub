import { describe, expect, it } from 'vitest';
import { PLAYER_HITBOX, PLAYER_SPEED, TILE_SIZE } from '../constants';
import { createWorldMap } from '../map';
import { directionFor, sanitizeInput, stepPlayer } from '../movement';
import { IDLE_INPUT } from '../types';

const map = createWorldMap();
const openPos = { x: 20 * TILE_SIZE + TILE_SIZE / 2, y: 10 * TILE_SIZE + TILE_SIZE / 2 };

describe('directionFor', () => {
  it('is zero when idle', () => {
    expect(directionFor(IDLE_INPUT)).toEqual({ dx: 0, dy: 0 });
  });

  it('normalizes diagonals so they are not faster', () => {
    const { dx, dy } = directionFor({ ...IDLE_INPUT, right: true, down: true });
    expect(Math.hypot(dx, dy)).toBeCloseTo(1);
  });

  it('cancels opposing keys', () => {
    expect(directionFor({ up: true, down: true, left: false, right: false })).toEqual({
      dx: 0,
      dy: 0,
    });
  });
});

describe('stepPlayer', () => {
  it('does not move when idle', () => {
    expect(stepPlayer(map, openPos, IDLE_INPUT, 50)).toEqual(openPos);
  });

  it('moves right at PLAYER_SPEED', () => {
    const next = stepPlayer(map, openPos, { ...IDLE_INPUT, right: true }, 50);
    expect(next.x).toBeCloseTo(openPos.x + PLAYER_SPEED * 0.05);
    expect(next.y).toBeCloseTo(openPos.y);
  });

  it('returns a new object (no mutation)', () => {
    const next = stepPlayer(map, openPos, { ...IDLE_INPUT, up: true }, 50);
    expect(next).not.toBe(openPos);
    expect(openPos.y).toBe(10 * TILE_SIZE + TILE_SIZE / 2);
  });

  it('stops at walls', () => {
    // Just right of the left border wall, pushing left.
    const nearWall = { x: TILE_SIZE + PLAYER_HITBOX / 2 + 1, y: openPos.y };
    const next = stepPlayer(map, nearWall, { ...IDLE_INPUT, left: true }, 1000);
    expect(next.x).toBeGreaterThanOrEqual(TILE_SIZE + PLAYER_HITBOX / 2 - 0.01);
  });

  it('slides along a wall on diagonal input', () => {
    const nearWall = { x: TILE_SIZE + PLAYER_HITBOX / 2 + 1, y: openPos.y };
    const next = stepPlayer(map, nearWall, { ...IDLE_INPUT, left: true, down: true }, 50);
    expect(next.x).toBeGreaterThanOrEqual(TILE_SIZE + PLAYER_HITBOX / 2 - 0.01);
    expect(next.y).toBeGreaterThan(nearWall.y);
  });

  it('clamps oversized dt to avoid teleporting', () => {
    const next = stepPlayer(map, openPos, { ...IDLE_INPUT, right: true }, 60_000);
    const maxTravel = PLAYER_SPEED * 0.25;
    expect(next.x - openPos.x).toBeLessThanOrEqual(maxTravel + 0.01);
  });

  it('ignores negative dt', () => {
    expect(stepPlayer(map, openPos, { ...IDLE_INPUT, right: true }, -100)).toEqual(openPos);
  });
});

describe('sanitizeInput', () => {
  it('accepts a well-formed payload', () => {
    expect(sanitizeInput({ up: true, down: false, left: false, right: true })).toEqual({
      up: true,
      down: false,
      left: false,
      right: true,
    });
  });

  it('coerces junk to idle', () => {
    expect(sanitizeInput(null)).toEqual(IDLE_INPUT);
    expect(sanitizeInput('lol')).toEqual(IDLE_INPUT);
    expect(sanitizeInput({ up: 'yes', right: 1 })).toEqual(IDLE_INPUT);
  });
});
