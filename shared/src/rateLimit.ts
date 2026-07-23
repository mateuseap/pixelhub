import { CHAT_RATE_MAX, CHAT_RATE_WINDOW_MS } from './constants';

/** Sliding-window rate limiter state. Immutable: every check returns a new state. */
export interface RateLimitState {
  readonly timestamps: readonly number[];
}

export const EMPTY_RATE_LIMIT: RateLimitState = { timestamps: [] };

export interface RateLimitResult {
  readonly allowed: boolean;
  readonly state: RateLimitState;
}

/**
 * Checks whether an event at `now` is allowed given at most `max` events per
 * `windowMs`. When allowed, the returned state includes the new event.
 */
export function checkRateLimit(
  state: RateLimitState,
  now: number,
  max: number = CHAT_RATE_MAX,
  windowMs: number = CHAT_RATE_WINDOW_MS,
): RateLimitResult {
  const recent = state.timestamps.filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    return { allowed: false, state: { timestamps: recent } };
  }
  return { allowed: true, state: { timestamps: [...recent, now] } };
}
