# pixelhub

A [Gather.town](https://gather.town)-style virtual space: walk a 2D pixel-art
world with your avatar, and when you get close to people, you can talk —
proximity text chat and spatial audio.

> **Status**: design phase. The deployment target already exists — pixelhub
> ships to [homelab](https://github.com/mateuseap/homelab) at
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

## Roadmap

- [ ] **M0 — design**: brainstorm → spec → implementation plan (docs/)
- [ ] **M1 — walkable world**: map renders, avatars move and see each other
- [ ] **M2 — proximity text chat**
- [ ] **M3 — proximity audio** (LiveKit, audio-only)
- [ ] **M4 — deploy**: `apps/pixelhub/` in homelab, TLS, monitoring
- [ ] **M5+ — later**: video, screen share, map editor, private zones

## License

MIT
