import { ROOM_NAME } from '@pixelhub/shared';
import { AccessToken, TrackSource } from 'livekit-server-sdk';
import type { LiveKitConfig } from '../config';

/**
 * Every player lands in a single LiveKit room; who you actually hear is
 * decided client-side by proximity (see @pixelhub/shared computeAudioPeers).
 */
export const LIVEKIT_ROOM = ROOM_NAME;

/** Tokens outlive any realistic session; LiveKit reuses them on reconnect. */
const TOKEN_TTL = '12h';

/**
 * Mints a LiveKit access token for one player. Identity is the Colyseus
 * sessionId (so audio peers map 1:1 to world avatars), display name is the
 * validated player name. Grants are audio-only: the client may publish its
 * microphone and subscribe to others, nothing else.
 */
export async function issueLiveKitToken(
  config: LiveKitConfig,
  sessionId: string,
  displayName: string,
): Promise<string> {
  const token = new AccessToken(config.apiKey, config.apiSecret, {
    identity: sessionId,
    name: displayName,
    ttl: TOKEN_TTL,
  });
  token.addGrant({
    room: LIVEKIT_ROOM,
    roomJoin: true,
    canPublish: true,
    canPublishSources: [TrackSource.MICROPHONE],
    canSubscribe: true,
    canPublishData: false,
  });
  return token.toJwt();
}
