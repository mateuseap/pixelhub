# Development Setup

Local development for PixelHub. For architecture see the [System Overview](../architecture/overview.md); for production deployment see the [Deployment Guide](../deployment/setup.md).

## Prerequisites

| Tool | Min version | Notes |
|------|-------------|-------|
| Node.js | 20.x | `engines` requires `>=20` |
| pnpm | 8.x | `corepack enable` provisions the pinned `pnpm@8.15.6` |

```bash
git clone https://github.com/mateuseap/pixelhub.git
cd pixelhub
corepack enable   # sets up pnpm at the version this repo pins
pnpm install
```

## Workspace Layout

PixelHub is a pnpm workspace with three packages (`pnpm-workspace.yaml`):

```
pixelhub/
├── shared/          @pixelhub/shared: pure TypeScript core (no engine imports)
│   └── src/         constants, map, collision, movement, proximity,
│                    proximityAudio, validation, rateLimit, types
├── server/          @pixelhub/server: Colyseus authoritative world
│   └── src/         index, app.config, config, metrics,
│                    rooms/WorldRoom, rooms/schema/WorldState, audio/livekit
├── client/          @pixelhub/client: Phaser 3 front end
│   └── src/         main, game/, net/, audio/, ui/
├── docker/          Dockerfiles + nginx config
└── docs/            this documentation
```

Both `client` and `server` depend on `shared` via `workspace:*`. In dev, the shared package is aliased directly to its TypeScript source (`shared/src/index.ts`) in the Vite and Vitest configs, so there is no build step between editing shared code and seeing it in the client or in tests.

## Running the App

```bash
pnpm dev
```

`pnpm dev` uses `concurrently` to start both packages:

- **Server** on `:2567` (Colyseus world room, plus `/health` and `/metrics`).
- **Client** on `http://localhost:5173` (Vite dev server).

Open `http://localhost:5173`, enter a display name, and you are in the world. Open a second tab to see two avatars interact.

### The same-origin `/colyseus` path

The client never hardcodes the server address. It always connects to the same-origin `/colyseus` path (`buildEndpoint` derives `ws(s)://<host>/colyseus` from `window.location`). In dev, Vite proxies that path to the server:

```ts
// client/vite.config.ts
server: {
  port: 5173,
  proxy: {
    '/colyseus': {
      target: 'http://localhost:2567',
      ws: true,                 // proxy the WebSocket upgrade too
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/colyseus/, ''),
    },
  },
}
```

In production the same path is proxied by Nginx to `server:2567`, so the client code path is identical in dev and prod. If a connection fails locally, check that the server is up on `:2567` and that nothing else is bound to `5173`.

## Production-like Stack (Docker)

To exercise the real Nginx proxy locally:

```bash
docker compose -f docker-compose.dev.yml up --build
```

This builds the server and Nginx-served client images and serves the client at `http://localhost:8080`, with Nginx proxying `/colyseus` to the server container. Prefer `pnpm dev` for day-to-day work; use this to validate the container path.

## Voice in Development

Voice is opt-in. Without `LIVEKIT_*` environment variables the world runs silently and shows no voice UI, which is the normal local default. To exercise voice locally you need a reachable LiveKit server and the three variables set for the server process:

```bash
# .env (server), see .env.example
PORT=2567
LIVEKIT_URL=wss://your-livekit-host
LIVEKIT_API_KEY=your-key
LIVEKIT_API_SECRET=your-secret
```

When set, the server sends each client a scoped token after join and the "Enable voice" button appears. See [ADR-004](../adr/004-audio-only-voice.md) and the [Deployment Guide](../deployment/setup.md) for how LiveKit is run in production.

## Common Commands

```bash
pnpm dev          # server (:2567) + Vite client (:5173), hot reload
pnpm -r build     # build shared, then server, then client
pnpm test         # run every package's test suite (see docs/testing.md)
pnpm typecheck    # typecheck all three packages
```

`pnpm -r build` respects package order (shared first, since server and client depend on it). Individual packages can be targeted with `pnpm --filter @pixelhub/<pkg> <script>`.

## Testing

Tests use Vitest across all three packages (148 tests total). To run the whole suite:

```bash
pnpm test
```

For the test layout, the client LiveKit fake, jsdom usage, coverage, and how to run a single package or file, see [docs/testing.md](../testing.md).

## Conventions

- **TypeScript strict, no `any`.** Use `unknown` for untrusted input and narrow it. Exported functions carry explicit types.
- **Immutability.** Never mutate in place; return new objects. The one sanctioned exception is the Colyseus schema (`WorldState` / `Player`), where in-place field assignment is the framework contract for state sync.
- **Many small, focused files.** Organize by feature (game, net, audio, ui). Keep files well under 800 lines.
- **Pure shared core.** Anything deterministic and engine-agnostic (map, collision, movement, proximity, validation, rate limiting) belongs in `@pixelhub/shared` so it can run identically on client and server. Never import Phaser, Colyseus, or LiveKit from `shared`.
- **Validate at the boundary.** All untrusted client input is sanitized and validated server-side before it touches game state.
- **No `console.log` in production paths.** The few intentional server logs use `console.info` / `console.error` with an eslint override.
- **No secrets in code.** Read them from the environment (`config.ts`); never hardcode.
- **Conventional Commits.** See [CONTRIBUTING.md](../../CONTRIBUTING.md).
