import type { LiveKitConfig } from '../config';

/**
 * TODO(M3 — proximity audio): LiveKit token issuance seam.
 *
 * Planned flow (see docs/ARCHITECTURE.md):
 *  1. Client joins the Colyseus room and requests an audio token.
 *  2. Server mints a LiveKit AccessToken (identity = sessionId, room = world)
 *     using `livekit-server-sdk`, with canPublish/canSubscribe audio-only.
 *  3. Client connects to the LiveKit SFU and subscribes/unsubscribes to peers
 *     as they enter/leave PROXIMITY_RADIUS, gain scaled by distance.
 *
 * Intentionally unimplemented in the MVP.
 */
export function issueLiveKitToken(config: LiveKitConfig | null, sessionId: string): never {
  void config;
  void sessionId;
  throw new Error('Proximity audio is not available yet (planned for M3).');
}
