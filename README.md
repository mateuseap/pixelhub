<div align="center">

# 👾 PixelHub

**A virtual space you can actually walk around in.**  
2D pixel world · Proximity chat · Self-hosted

[![CI](https://github.com/mateuseap/pixelhub/actions/workflows/publish-images.yml/badge.svg)](https://github.com/mateuseap/pixelhub/actions)
[![license](https://img.shields.io/github/license/mateuseap/pixelhub?style=flat-square&color=5ba3b0)](LICENSE)
[![stars](https://img.shields.io/github/stars/mateuseap/pixelhub?style=flat-square)](https://github.com/mateuseap/pixelhub/stargazers)
[![visitors](https://visitor-badge.laobi.icu/badge?page_id=mateuseap.pixelhub)](https://github.com/mateuseap/pixelhub)

<br />

</div>

---

## Why PixelHub?

Video calls put everyone in a grid; real rooms let you drift between conversations. PixelHub is a [Gather](https://gather.town)-style space: walk a 2D pixel world with your avatar, and only the people near you hear you. It runs on your own server, fits a 1 vCPU VPS, and every conversation stays yours.

- **Proximity is the interface.** Walk up to someone to talk, walk away to leave.
- **Server-authoritative.** Movement and chat delivery are validated server-side.
- **No assets to license.** Every texture is generated programmatically.
- **Self-hosted.** One Docker image pair, deployable to any Kubernetes or compose setup.

## Features

|  |  |
|--|--|
| 🗺 **2D World** | 40x30 tile map with collision, rendered by Phaser 3 |
| 🚶 **Real-time Movement** | Server simulation at 20 ticks/s, client prediction + interpolation |
| 💬 **Proximity Chat** | Messages reach only players within 5 tiles, filtered server-side |
| 🫧 **Speech Bubbles** | See who is talking above their avatar |
| 🛡 **Input Validation** | Name/message limits, sanitized movement, 5 msg/5s rate limit |
| 🎙 **Proximity Audio** | Next milestone: self-hosted LiveKit, audio-only Opus |
| 🐳 **Docker-first** | Multi-stage images, nginx WebSocket proxy, GHCR publishing |

## Quick Start

Requirements: Node >= 20 and pnpm >= 8 (`corepack enable` sets up pnpm).

```bash
git clone https://github.com/mateuseap/pixelhub && cd pixelhub
pnpm install
pnpm dev        # server on :2567 + Vite client on http://localhost:5173
```

Production-like stack (nginx client on `http://localhost:8080`):

```bash
docker compose -f docker-compose.dev.yml up --build
```

Other useful commands:

```bash
pnpm -r build   # build shared, server, and client
pnpm test       # shared unit tests + server room tests (vitest)
pnpm typecheck  # typecheck all packages
```

The client always talks to the server via the same-origin `/colyseus` path. Vite proxies it in dev, nginx proxies it in Docker/Kubernetes.

## Stack

| Layer | Technology |
|-------|-----------|
| Rendering | Phaser 3, Vite, TypeScript |
| Multiplayer | Colyseus 0.15 (authoritative rooms, schema state sync) |
| Shared logic | Pure TypeScript package (map, collision, proximity, validation) |
| Audio (M3) | LiveKit, self-hosted, audio-only |
| DevOps | Docker, Nginx, GitHub Actions, GHCR |
| Deployment | [homelab](https://github.com/mateuseap/homelab) GitOps cluster |

## Roadmap

- [x] **M0** design: spec and architecture (docs/)
- [x] **M1** walkable world: map renders, avatars move and see each other
- [x] **M2** proximity text chat
- [ ] **M3** proximity audio (LiveKit, audio-only)
- [x] **M4** deploy: `apps/pixelhub/` in homelab, TLS, monitoring
- [ ] **M5+** later: video, screen share, map editor, private zones

## Documentation

| Doc | Description |
|-----|------------|
| [Architecture](docs/ARCHITECTURE.md) | Runtime diagram, core loop, constraints |

## License

MIT, see [LICENSE](LICENSE).
