# Testing

PixelHub is tested with [Vitest](https://vitest.dev/) across all three workspace packages. The suite has **148 tests total**, split as follows:

| Package | Environment | Tests | Files |
|---------|-------------|-------|-------|
| `@pixelhub/shared` | node | 58 | `src/__tests__/*.test.ts` |
| `@pixelhub/server` | node | 23 | `test/*.test.ts` |
| `@pixelhub/client` | jsdom | 67 | `test/*.test.ts` |
| **Total** | | **148** | |

## Running the Tests

```bash
pnpm test                              # all three packages, in order
pnpm --filter @pixelhub/shared test    # just the shared core
pnpm --filter @pixelhub/server test    # just the server
pnpm --filter @pixelhub/client test    # just the client
```

To run a single file or a single test, use Vitest directly inside a package:

```bash
cd shared && pnpm exec vitest run src/__tests__/movement.test.ts
cd server && pnpm exec vitest run -t "rejects an over-long name"
```

`pnpm test` runs the packages sequentially (shared, then server, then client) so a failure in the deterministic core surfaces first.

## Layout

### Shared (58 tests, node)

The shared core is pure and deterministic, so it is tested exhaustively with plain unit tests. One file per module under `src/__tests__/`:

| File | Covers |
|------|--------|
| `map.test.ts` | 40x30 map construction, border walls, obstacles, spawn tiles are walkable |
| `collision.test.ts` | `isBoxBlocked` overlap against tiles and edges |
| `movement.test.ts` | `directionFor` normalization (diagonals not faster), `stepPlayer` bounds/wall-sliding, `sanitizeInput` coercion |
| `proximity.test.ts` | `tileDistance`, `isWithinProximity`, `filterChatRecipients` cutoff at radius 5 |
| `proximityAudio.test.ts` | `audioGainForDistance` full/linear/zero regions, `computeAudioPeers` in-range filtering |
| `validation.test.ts` | Name and message length caps, trimming, control-char rejection |
| `rateLimit.test.ts` | Sliding-window `checkRateLimit` (5 per 5s), immutability of returned state |

### Server (23 tests, node)

The server tests boot a real Colyseus test server with `@colyseus/testing` and drive it with a real `colyseus.js` client, so they are integration tests over the actual room lifecycle.

| File | Covers |
|------|--------|
| `WorldRoom.test.ts` | Join/auth (name validation, rejection of invalid/over-long names), distinct color assignment, movement via the tick, server-side chat proximity filtering, chat validation and the 5-per-5s rate limit, and the audio-token message when LiveKit is configured (17 tests) |
| `livekit.test.ts` | `issueLiveKitToken` grant contents: identity is the sessionId, room is the shared room, publish is microphone-only, subscribe allowed, data publish denied (6 tests) |
| `helpers.ts` | Test utilities (`waitForMessage`, `collectMessages`, `sleep`), not a test file |

`server/vitest.config.ts` uses the `node` environment, disables file parallelism (the Colyseus test server binds a port, so runs are serial), and raises the test/hook timeouts to 15s for boot.

### Client (67 tests, jsdom)

The client tests run in the `jsdom` environment (`client/vitest.config.ts`) so DOM-driven UI and the browser-facing voice manager can be tested without a real browser.

| File | Covers |
|------|--------|
| `voiceManager.test.ts` | The full voice state machine: enable/mute/unmute, proximity subscribe/unsubscribe and per-peer volume, restore after refresh, reconnect, permission-denied listen-only fallback, teardown (25 tests) |
| `chatPanel.test.ts` | Message rendering, self vs. other, system messages, nearby list, render cap (14 tests) |
| `voiceControls.test.ts` | Button labels and status text per voice state (11 tests) |
| `joinScreen.test.ts` | Local name validation and the join hand-off (7 tests) |
| `connection.test.ts` | `buildEndpoint` scheme/host derivation for the same-origin `/colyseus` path (6 tests) |
| `textures.test.ts` | Programmatic texture generation (4 tests) |
| `fakeLivekit.ts` | The LiveKit fake (see below), not a test file |

## The Client LiveKit Fake

`client/test/fakeLivekit.ts` is a controllable in-memory stand-in for the parts of `livekit-client` that `VoiceManager` touches: `Room`, `ConnectionState`, `RoomEvent`, `Track`, participants, and track publications. It is wired in with `vi.mock('livekit-client', () => import('./fakeLivekit'))`.

The fake lets tests:

- Inspect created room instances and their subscription/volume state.
- Script connect and microphone failures (including permission-denied `DOMException`s) to exercise the error and listen-only paths.
- Emit LiveKit room events (track published, active speakers changed, reconnecting, disconnected) to drive the state machine deterministically.

This is why the voice manager can be tested thoroughly with no real WebRTC, no media devices, and no LiveKit server.

## What Is Covered

- **Deterministic game core** (map, collision, movement, proximity, audio gain, validation, rate limiting) is unit-tested exhaustively in `shared`.
- **Server authority** (auth, movement via the real tick, chat proximity filtering, rate limiting, token grants) is integration-tested against a real Colyseus room.
- **Client UI and voice** (chat panel, join screen, voice controls, endpoint building, textures, and the complete voice state machine) are tested under jsdom with the LiveKit fake.

The rendering-heavy Phaser scene glue (camera, sprite tweening) is intentionally light on tests; its logic lives in the shared, unit-tested `stepPlayer` and proximity functions.
