import { beforeEach, describe, expect, it, vi } from 'vitest';

const { joinOrCreate, clientEndpoints } = vi.hoisted(() => ({
  joinOrCreate: vi.fn(),
  clientEndpoints: [] as string[],
}));

vi.mock('colyseus.js', () => ({
  Client: class {
    constructor(endpoint: string) {
      clientEndpoints.push(endpoint);
    }
    joinOrCreate = joinOrCreate;
  },
}));

import { buildEndpoint, joinWorld } from '../src/net/connection';

beforeEach(() => {
  joinOrCreate.mockReset();
  clientEndpoints.length = 0;
});

describe('buildEndpoint', () => {
  it('builds a ws endpoint on the /colyseus path for http origins', () => {
    expect(buildEndpoint({ protocol: 'http:', host: 'example.com' })).toBe(
      'ws://example.com/colyseus',
    );
  });

  it('builds a wss endpoint for https origins', () => {
    expect(buildEndpoint({ protocol: 'https:', host: 'pixelhub.example.com' })).toBe(
      'wss://pixelhub.example.com/colyseus',
    );
  });

  it('keeps a non-default port because host includes it', () => {
    expect(buildEndpoint({ protocol: 'http:', host: 'localhost:5173' })).toBe(
      'ws://localhost:5173/colyseus',
    );
  });

  it('defaults to the current window location', () => {
    expect(buildEndpoint()).toBe(`ws://${window.location.host}/colyseus`);
  });
});

describe('joinWorld', () => {
  it('joins the world room with the given display name over the same-origin endpoint', async () => {
    const fakeRoom = { sessionId: 'abc' };
    joinOrCreate.mockResolvedValue(fakeRoom);

    const room = await joinWorld('Ada');

    expect(clientEndpoints).toEqual([`ws://${window.location.host}/colyseus`]);
    expect(joinOrCreate).toHaveBeenCalledWith('world', { name: 'Ada' });
    expect(room).toBe(fakeRoom);
  });

  it('propagates join failures to the caller', async () => {
    joinOrCreate.mockRejectedValue(new Error('room full'));
    await expect(joinWorld('Ada')).rejects.toThrow('room full');
  });
});
