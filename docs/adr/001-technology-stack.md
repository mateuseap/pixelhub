# ADR-001: Technology Stack Selection

**Status:** Accepted
**Date:** 2026-07-01

## Context

PixelHub is a Gather.town-style 2D virtual space: players walk a pixel world with an avatar, and only the people near them can read their chat or hear their voice. Two constraints shape every technology choice:

- **Fully self-hosted.** No paid third-party realtime or media services. The whole system runs from one pair of Docker images on infrastructure the owner controls.
- **A 1 vCPU / 4 GB VPS.** The target host is a small shared node in the [homelab](https://github.com/mateuseap/homelab) GitOps cluster. Everything has to fit a realistic budget of roughly 10 to 15 concurrent users for v1.

The stack is TypeScript end to end so the world simulation (map, collision, movement, proximity, validation) can be written once in a shared package and run byte-identical on the client for prediction and on the server for authority.

## Decisions

### Rendering: Phaser 3 over hand-rolled canvas or PixiJS

Phaser 3 is a mature, batteries-included 2D game engine: scene lifecycle, a WebGL/Canvas renderer with automatic fallback, a keyboard input system, camera follow, and texture generation are all built in. A tile world with animated avatars, a follow camera, and a resize-aware viewport is close to the framework's happy path, so almost no engine code has to be written. Every texture in PixelHub is generated programmatically at runtime, so there are no art assets to license or ship.

Phaser ships as its own Rollup chunk and is loaded through a small terser-minified shim, keeping the engine out of the app's cache-busting path.

### Multiplayer: Colyseus 0.15 over raw WebSocket or Socket.IO

Colyseus is an authoritative room framework built for exactly this shape of game. It gives us:

- **Rooms** with a server-owned lifecycle (`onCreate`, `onAuth`, `onJoin`, `onLeave`).
- **A schema state sync** (`@colyseus/schema`) that binary-encodes only the fields that changed each patch and reflects them into `room.state` on every client, with per-field `listen()` callbacks. We never hand-write a movement wire format.
- **A fixed-rate simulation interval** (`setSimulationInterval`) that drives the server tick.
- **A message channel** for client intents (movement input, chat) separate from synced state.

Raw WebSocket would mean reimplementing all of the above. Socket.IO solves transport but not authoritative state sync.

### Shared logic: a pure TypeScript workspace package

`@pixelhub/shared` holds the deterministic core with no engine or framework imports: the map, box collision, `stepPlayer` integration, proximity math, audio gain falloff, input/name/message validation, and the rate limiter. Both client and server depend on it, which is what makes client-side prediction match the server exactly.

### Voice: LiveKit, self-hosted, audio-only over a mesh or a paid SFU

Proximity voice needs a media server that can route many audio tracks and let each client choose which peers to subscribe to. A full peer-to-peer mesh does not scale past a handful of participants, and paid SFUs violate the self-hosted requirement. LiveKit is an open-source WebRTC SFU we can run in the same cluster. The server mints scoped access tokens with `livekit-server-sdk`; the client uses `livekit-client` to publish its microphone and subscribe to nearby peers. See [ADR-004](./004-audio-only-voice.md) for why voice is audio-only.

### Tooling: Vite, pnpm workspaces, Vitest

- **Vite** builds and serves the client, and proxies the same-origin `/colyseus` path to the server in dev so the client code path is identical in development and production.
- **pnpm workspaces** manage the `client` / `server` / `shared` monorepo with a single lockfile.
- **Vitest** runs unit and integration tests across all three packages.

### DevOps: Docker, Nginx, GitHub Actions, GHCR

Multi-stage Dockerfiles produce a server image and an Nginx-served client image. Nginx proxies the same-origin `/colyseus` path (HTTP matchmaking plus the WebSocket upgrade) to the server service, so the browser only ever talks to one origin. GitHub Actions builds both images and publishes them to GHCR; the homelab cluster deploys them. See [ADR-004](./004-audio-only-voice.md) and the [Deployment Guide](../deployment/setup.md).

## Consequences

- The entire stack is TypeScript, so the shared simulation is written once and trusted on both sides.
- Colyseus owns the wire format, so there is no bespoke serialization to maintain, at the cost of adopting its room and schema conventions.
- Phaser is a large dependency (~1 MB compressed), mitigated by chunk-splitting and gzip.
- LiveKit adds an SFU process to operate, justified by the fact that no self-hosted alternative offers per-peer subscription control at this quality.
