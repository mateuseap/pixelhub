import { describe, expect, it } from 'vitest';
import { CHAT_RATE_MAX, CHAT_RATE_WINDOW_MS } from '../constants';
import { EMPTY_RATE_LIMIT, checkRateLimit, type RateLimitState } from '../rateLimit';

const drain = (state: RateLimitState, times: number, now: number): RateLimitState => {
  let current = state;
  for (let i = 0; i < times; i += 1) {
    current = checkRateLimit(current, now).state;
  }
  return current;
};

describe('checkRateLimit', () => {
  it('allows the first message', () => {
    const result = checkRateLimit(EMPTY_RATE_LIMIT, 1000);
    expect(result.allowed).toBe(true);
    expect(result.state.timestamps).toEqual([1000]);
  });

  it('allows exactly CHAT_RATE_MAX messages in a window', () => {
    const state = drain(EMPTY_RATE_LIMIT, CHAT_RATE_MAX - 1, 1000);
    expect(checkRateLimit(state, 1001).allowed).toBe(true);
  });

  it('blocks the message after the limit', () => {
    const state = drain(EMPTY_RATE_LIMIT, CHAT_RATE_MAX, 1000);
    const result = checkRateLimit(state, 1001);
    expect(result.allowed).toBe(false);
  });

  it('allows again once the window slides past', () => {
    const state = drain(EMPTY_RATE_LIMIT, CHAT_RATE_MAX, 1000);
    const later = 1000 + CHAT_RATE_WINDOW_MS;
    expect(checkRateLimit(state, later).allowed).toBe(true);
  });

  it('drops expired timestamps from the returned state', () => {
    const state = drain(EMPTY_RATE_LIMIT, CHAT_RATE_MAX, 1000);
    const later = 1000 + CHAT_RATE_WINDOW_MS;
    const result = checkRateLimit(state, later);
    expect(result.state.timestamps).toEqual([later]);
  });

  it('does not mutate the input state', () => {
    const state: RateLimitState = { timestamps: [1000] };
    checkRateLimit(state, 2000);
    expect(state.timestamps).toEqual([1000]);
  });
});
