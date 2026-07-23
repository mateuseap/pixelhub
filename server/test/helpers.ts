import type { Room as ClientRoom } from 'colyseus.js';

/** Resolves with the next message of `type`, or rejects after `timeoutMs`. */
export function waitForMessage<T>(
  client: ClientRoom,
  type: string,
  timeoutMs = 3000,
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out waiting for "${type}" message`)),
      timeoutMs,
    );
    client.onMessage(type, (payload: T) => {
      clearTimeout(timer);
      resolve(payload);
    });
  });
}

/** Collects every `type` message received during `windowMs`. */
export function collectMessages<T>(
  client: ClientRoom,
  type: string,
  windowMs = 500,
): Promise<readonly T[]> {
  return new Promise((resolve) => {
    const received: T[] = [];
    client.onMessage(type, (payload: T) => {
      received.push(payload);
    });
    setTimeout(() => resolve(received), windowMs);
  });
}

export const sleep = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));
