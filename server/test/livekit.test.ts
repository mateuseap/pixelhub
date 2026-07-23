import { ROOM_NAME } from '@pixelhub/shared';
import { describe, expect, it } from 'vitest';
import { LIVEKIT_ROOM, issueLiveKitToken } from '../src/audio/livekit';
import type { LiveKitConfig } from '../src/config';

const TEST_CONFIG: LiveKitConfig = {
  url: 'wss://livekit.example.test',
  apiKey: 'test-api-key',
  apiSecret: 'test-api-secret-0123456789abcdef0123456789abcdef',
};

interface JwtPayload {
  readonly iss?: string;
  readonly sub?: string;
  readonly name?: string;
  readonly exp?: number;
  readonly nbf?: number;
  readonly video?: {
    readonly room?: string;
    readonly roomJoin?: boolean;
    readonly canPublish?: boolean;
    readonly canSubscribe?: boolean;
    readonly canPublishData?: boolean;
    readonly canPublishSources?: readonly string[];
  };
}

function decodeJwtPayload(jwt: string): JwtPayload {
  const parts = jwt.split('.');
  expect(parts).toHaveLength(3);
  return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as JwtPayload;
}

describe('issueLiveKitToken', () => {
  it('signs a decodable JWT with the API key as issuer', async () => {
    const jwt = await issueLiveKitToken(TEST_CONFIG, 'session-1', 'Alice');
    const payload = decodeJwtPayload(jwt);
    expect(payload.iss).toBe(TEST_CONFIG.apiKey);
  });

  it('uses the Colyseus sessionId as identity and the display name as name', async () => {
    const jwt = await issueLiveKitToken(TEST_CONFIG, 'abc123', 'Bob');
    const payload = decodeJwtPayload(jwt);
    expect(payload.sub).toBe('abc123');
    expect(payload.name).toBe('Bob');
  });

  it('grants join access to the single shared world room only', async () => {
    const jwt = await issueLiveKitToken(TEST_CONFIG, 's', 'N');
    const { video } = decodeJwtPayload(jwt);
    expect(LIVEKIT_ROOM).toBe(ROOM_NAME);
    expect(video?.room).toBe(ROOM_NAME);
    expect(video?.roomJoin).toBe(true);
  });

  it('grants audio-only publishing (microphone source) and subscription', async () => {
    const jwt = await issueLiveKitToken(TEST_CONFIG, 's', 'N');
    const { video } = decodeJwtPayload(jwt);
    expect(video?.canPublish).toBe(true);
    expect(video?.canSubscribe).toBe(true);
    expect(video?.canPublishData).toBe(false);
    expect(video?.canPublishSources).toEqual(['microphone']);
  });

  it('sets an expiry in the future', async () => {
    const jwt = await issueLiveKitToken(TEST_CONFIG, 's', 'N');
    const payload = decodeJwtPayload(jwt);
    expect(payload.exp).toBeGreaterThan(Date.now() / 1000);
  });

  it('issues distinct tokens per session', async () => {
    const a = await issueLiveKitToken(TEST_CONFIG, 'session-a', 'A');
    const b = await issueLiveKitToken(TEST_CONFIG, 'session-b', 'B');
    expect(a).not.toBe(b);
    expect(decodeJwtPayload(a).sub).toBe('session-a');
    expect(decodeJwtPayload(b).sub).toBe('session-b');
  });
});
