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
| 🎙 **Proximity Voice** | Self-hosted LiveKit SFU, audio-only Opus, volume falls off with distance |
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
pnpm test       # shared unit + server room + client (jsdom) tests (vitest)
pnpm typecheck  # typecheck all packages
```

The client always talks to the server via the same-origin `/colyseus` path. Vite proxies it in dev, nginx proxies it in Docker/Kubernetes.

## Voice chat

Voice is opt-in per deployment. Without configuration the world runs silently and shows no voice UI.

| Env var (server) | Meaning |
|------------------|---------|
| `LIVEKIT_URL` | Public wss URL of the LiveKit server |
| `LIVEKIT_API_KEY` | API key id used to sign access tokens |
| `LIVEKIT_API_SECRET` | API secret used to sign access tokens |

When set, the server sends each player a scoped LiveKit token after join. The client shows an "Enable voice" button (microphone permission is requested only then), publishes audio-only, and subscribes exclusively to players within the proximity radius, with playback volume falling off linearly with distance. Speaking players get a green ring under their avatar. The choice persists: after a page refresh the client reconnects to voice by itself (the browser only re-asks for the microphone if permission was granted one time only).

## Stack

| Layer | Technology |
|-------|-----------|
| Rendering | Phaser 3, Vite, TypeScript |
| Multiplayer | Colyseus 0.15 (authoritative rooms, schema state sync) |
| Shared logic | Pure TypeScript package (map, collision, proximity, validation) |
| Audio | LiveKit, self-hosted, audio-only |
| DevOps | Docker, Nginx, GitHub Actions, GHCR |
| Deployment | [homelab](https://github.com/mateuseap/homelab) GitOps cluster |

## Roadmap

- [x] **M0** design: spec and architecture (docs/)
- [x] **M1** walkable world: map renders, avatars move and see each other
- [x] **M2** proximity text chat
- [x] **M3** proximity audio (LiveKit, audio-only)
- [x] **M4** deploy: `apps/pixelhub/` in homelab, TLS, monitoring
- [ ] **M5+** later: video, screen share, map editor, private zones

## Documentation

| Doc | Description |
|-----|------------|
| [System Overview](docs/architecture/overview.md) | Architecture diagram, the three packages, component map |
| [System Design](docs/architecture/system-design.md) | Tick loop, state sync, prediction, proximity pipeline, LiveKit token flow |
| [ADRs](docs/adr/) | Stack choice, server-authoritative movement, proximity model, audio-only voice |
| [Development Setup](docs/development/setup.md) | Local dev, workspace layout, the Vite `/colyseus` proxy, conventions |
| [Deployment Guide](docs/deployment/setup.md) | GHCR images, homelab manifests, LiveKit ports, env vars, Nginx proxy |
| [Testing](docs/testing.md) | Test layout, the client LiveKit fake, coverage, how to run |
| [Security](docs/security/security.md) | Server authority, chat filtering, rate limits, token least-privilege, secrets |
| [References](docs/references.md) | Curated study links for the whole stack |

## Contributing

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR. Branch from `main`, use Conventional Commits, keep the test suite green, and assign **@mateuseap** for review.

## Learn more

New to any part of the stack? [docs/references.md](docs/references.md) is a curated set of official study links for Phaser 3, Colyseus, LiveKit and WebRTC, pnpm workspaces, Vite, Vitest, TypeScript, WebSockets, and Docker, so you can learn every layer of PixelHub from primary sources.

## License

MIT, see [LICENSE](LICENSE).
