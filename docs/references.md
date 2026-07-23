# References and Study Links

A curated reading list for the whole PixelHub stack, grouped by topic. These are official docs and primary sources, chosen so you can learn every layer of the project from the ground up. Versions in parentheses are what PixelHub currently uses.

## Phaser 3 (rendering)

- [Phaser official site](https://phaser.io/)
- [Phaser 3 documentation](https://docs.phaser.io/phaser/getting-started/what-is-phaser)
- [Phaser 3 API reference](https://docs.phaser.io/api-documentation/api-documentation)
- [Phaser examples](https://labs.phaser.io/)
- [Phaser GitHub repository](https://github.com/phaserjs/phaser)

## Colyseus (authoritative multiplayer)

- [Colyseus documentation](https://docs.colyseus.io/)
- [Rooms and lifecycle](https://docs.colyseus.io/server/room/)
- [State synchronization with @colyseus/schema](https://docs.colyseus.io/state/schema/)
- [Client SDK (colyseus.js)](https://docs.colyseus.io/client/)
- [Built-in load / integration testing](https://docs.colyseus.io/tools/unit-testing/)
- [Colyseus GitHub repository](https://github.com/colyseus/colyseus)

## LiveKit (voice / WebRTC SFU)

- [LiveKit documentation](https://docs.livekit.io/)
- [LiveKit home](https://livekit.io/)
- [Realtime SDKs overview](https://docs.livekit.io/home/client/)
- [JavaScript client SDK](https://docs.livekit.io/reference/client-sdks/)
- [Access tokens and grants](https://docs.livekit.io/home/get-started/authentication/)
- [Server APIs and server SDKs](https://docs.livekit.io/home/server/)
- [Self-hosting LiveKit](https://docs.livekit.io/home/self-hosting/deployment/)
- [Ports and firewall configuration](https://docs.livekit.io/home/self-hosting/ports-firewall/)
- [LiveKit server GitHub repository](https://github.com/livekit/livekit)

## WebRTC and SFU concepts (background for voice)

- [WebRTC API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API)
- [WebRTC official site](https://webrtc.org/)
- [getUserMedia (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia)
- [Opus audio codec](https://opus-codec.org/)
- [WebRTC for the Curious (open book on SFU, ICE, media)](https://webrtcforthecurious.com/)

## pnpm workspaces (monorepo)

- [pnpm documentation](https://pnpm.io/motivation)
- [Workspaces](https://pnpm.io/workspaces)
- [Filtering (`--filter`)](https://pnpm.io/filtering)
- [`pnpm-workspace.yaml`](https://pnpm.io/pnpm-workspace_yaml)
- [Corepack](https://nodejs.org/api/corepack.html)

## Vite (client build and dev server)

- [Vite documentation](https://vite.dev/)
- [Server options, including proxy](https://vite.dev/config/server-options.html)
- [Build options](https://vite.dev/config/build-options.html)
- [Rollup manual chunks](https://rollupjs.org/configuration-options/#output-manualchunks)

## Vitest (testing)

- [Vitest documentation](https://vitest.dev/)
- [Configuration reference](https://vitest.dev/config/)
- [Test environments (node, jsdom)](https://vitest.dev/guide/environment.html)
- [Mocking (`vi.mock`)](https://vitest.dev/guide/mocking.html)
- [jsdom](https://github.com/jsdom/jsdom)

## TypeScript

- [TypeScript documentation](https://www.typescriptlang.org/docs/)
- [The TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [tsconfig reference](https://www.typescriptlang.org/tsconfig)
- [Do's and Don'ts](https://www.typescriptlang.org/docs/handbook/declaration-files/do-s-and-don-ts.html)

## WebSockets (the transport under Colyseus)

- [WebSocket API (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Writing WebSocket client applications (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API/Writing_WebSocket_client_applications)
- [RFC 6455: The WebSocket Protocol](https://datatracker.ietf.org/doc/html/rfc6455)
- [nginx WebSocket proxying guide](https://nginx.org/en/docs/http/websocket.html)

## Docker and Nginx (packaging and serving)

- [Docker documentation](https://docs.docker.com/)
- [Multi-stage builds](https://docs.docker.com/build/building/multi-stage/)
- [Dockerfile reference](https://docs.docker.com/reference/dockerfile/)
- [Docker Compose](https://docs.docker.com/compose/)
- [Nginx documentation](https://nginx.org/en/docs/)
- [Nginx reverse proxy guide](https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/)

## Deployment platform

- [Kubernetes documentation](https://kubernetes.io/docs/home/)
- [k3s (lightweight Kubernetes)](https://docs.k3s.io/)
- [Sealed Secrets](https://github.com/bitnami-labs/sealed-secrets)
- [Prometheus (metrics)](https://prometheus.io/docs/introduction/overview/)
- [prom-client (Node.js Prometheus client)](https://github.com/siimon/prom-client)
- [homelab: the GitOps cluster PixelHub deploys to](https://github.com/mateuseap/homelab)
