# Architecture (draft — refined during M0 design)

```
Browser (Phaser 3)
  │  WebSocket — position/state sync
  ▼
Colyseus room server ──── issues LiveKit tokens
  │                              │
  │  distance(a, b) < R ?        ▼
  └────── subscribe ──────▶ LiveKit SFU (audio tracks, Opus ~40kbps)
```

## Core loop

1. Client joins a Colyseus room; server owns authoritative world state.
2. Clients send movement intents; server validates (collision, speed) and
   broadcasts; clients interpolate.
3. Server computes proximity pairs each tick. Entering radius R:
   - text chat channel opens between the avatars
   - client subscribes to the peer's LiveKit audio track, gain scaled by distance
4. Leaving radius R: unsubscribe, channel closes.

## Constraints

- Host: shared 1 vCPU / 4GB VPS (homelab) → audio-only SFU, ~10-15 concurrent
  users realistic for v1.
- Deploys as `apps/pixelhub/` manifests in the homelab repo; images from GHCR
  via the same CI pattern as chesskernel.

## Voice (M3, implemented)

```
Browser A                    Colyseus room                LiveKit SFU
   |  join                        |                            |
   |------------------------------>                            |
   |  audio-token (scoped JWT)    |                            |
   <------------------------------|                            |
   |  Enable voice (user gesture) |                            |
   |------------------------------------------------------------>
   |  publish mic (Opus)          |                            |
   |  subscribe only to peers within PROXIMITY_RADIUS          |
   |  volume per peer = linear falloff with tile distance      |
```

- The server issues a LiveKit token per player on join (identity = sessionId, publish audio only). Voice env vars absent: no token message, no UI, zero behavior change.
- `shared/src/proximityAudio.ts` is the pure core: `audioGainForDistance` (1.0 inside 1 tile, linear to 0 at the radius) and `computeAudioPeers` (in-range set with gains). Client applies it every 300 ms: subscribe/unsubscribe plus `participant.setVolume(gain)`.
- Everyone shares one SFU room; audibility is a client-side subscription decision driven by server-authoritative positions. Audio-only keeps the 1 vCPU host comfortable.
