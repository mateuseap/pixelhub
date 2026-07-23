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
