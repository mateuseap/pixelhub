# pixelhub

A [Gather.town](https://gather.town)-style virtual space: walk a 2D pixel-art
world with your avatar, and when you get close to people, you can talk —
proximity text chat and spatial audio.

> **Status**: MVP — walkable world + proximity text chat. The deployment
> target already exists — pixelhub ships to
> [homelab](https://github.com/mateuseap/homelab) at
> `pixelhub.lab.mateuseap.com` as `apps/pixelhub/`.

## v1 scope

- 🗺️ 2D tile-based world (maps authored in [Tiled](https://www.mapeditor.org/))
- 🚶 Real-time avatar movement, interpolated
- 💬 Proximity text chat (see who's near you, talk to them)
- 🎙️ Proximity audio — voices fade in as avatars approach (audio-only by
  design: the host is a 1 vCPU VPS, video SFU comes later)

## Planned stack

| Piece | Choice | Why |
|---|---|---|
| Rendering | [Phaser 3](https://phaser.io/) | Batteries-included 2D engine, Tiled support |
| Multiplayer state | [Colyseus](https://colyseus.io/) | Rooms, authoritative state sync, TS-native |
| Audio | [LiveKit](https://livekit.io/) (self-hosted) | SFU with per-track subscribe → proximity = subscribe/unsubscribe |
| Monorepo | pnpm workspaces (`client` / `server` / `shared`) | Same layout as [chesskernel](https://github.com/mateuseap/chesskernel) |

## Run locally

Requirements: Node >= 20 and pnpm >= 8 (`corepack enable` sets up pnpm).

```bash
pnpm install
pnpm dev        # server on :2567 + Vite client on http://localhost:5173
```

The client always talks to the server via the same-origin `/colyseus` path —
Vite proxies it in dev, nginx proxies it in Docker/Kubernetes.

Other useful commands:

```bash
pnpm -r build   # build shared, server, and client
pnpm test       # shared unit tests + server room tests (vitest)
pnpm typecheck  # typecheck all packages

# Production-like stack (nginx client on http://localhost:8080)
docker compose -f docker-compose.dev.yml up --build
```

## Roadmap

- [x] **M0 — design**: brainstorm → spec → implementation plan (docs/)
- [x] **M1 — walkable world**: map renders, avatars move and see each other
- [x] **M2 — proximity text chat**
- [ ] **M3 — proximity audio** (LiveKit, audio-only)
- [ ] **M4 — deploy**: `apps/pixelhub/` in homelab, TLS, monitoring
- [ ] **M5+ — later**: video, screen share, map editor, private zones

## License

MIT
