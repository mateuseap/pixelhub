# Security

PixelHub is a self-hosted, user-facing realtime app. This document describes its threat model and the controls that address each surface. The unifying principle is that the **server is authoritative** and the client is never trusted.

## Threat Model

| Surface | Threat |
|---------|--------|
| Movement | A modified client teleporting, walking through walls, or placing itself anywhere to eavesdrop |
| Chat delivery | Receiving proximity messages the sender never intended for you |
| Input handling | Malformed or malicious payloads (movement, names, messages) corrupting state |
| Abuse | Chat spam / flooding |
| Voice | A leaked or replayed token doing more than it should |
| Secrets | Credentials leaking through the client bundle or the repository |

## Server-Authoritative Movement

Clients never report positions. They send only a directional intent, which the server sanitizes (`sanitizeInput` coerces any untrusted payload into four booleans) and integrates on its own tick with the shared `stepPlayer`, clamping to world bounds and resolving collision against the tile map. The worst a tampered client can do is send intent booleans, which the server validates against walls and bounds anyway. Because chat and voice audibility are computed from these server-owned positions, they cannot be spoofed by a client claiming a false location. See [ADR-002](../adr/002-server-authoritative-movement.md).

## Server-Side Chat Recipient Filtering

Proximity chat is a real privacy boundary, not a display filter. When a message arrives, the server computes the recipient set with `filterChatRecipients(senderPos, roster)` over the current authoritative positions and sends the broadcast **only** to session ids within `PROXIMITY_RADIUS` (5 tiles). Out-of-range clients never receive the payload, so a modified client cannot read or reconstruct messages it was never sent. See [ADR-003](../adr/003-proximity-model.md).

## Rate Limiting

Chat is rate-limited per session with an immutable sliding window: at most **`CHAT_RATE_MAX = 5` messages per `CHAT_RATE_WINDOW_MS = 5000` ms**. The limiter (`checkRateLimit`) filters timestamps to the current window and refuses once the count is reached; a refused message returns a `chat-error` only to the sender and is never broadcast. The rate-limit state is server-side per-session bookkeeping and is never synced to clients.

## Input Validation

All untrusted input is validated at the server boundary before it touches game state.

| Input | Rule |
|-------|------|
| Display name | Must be a string; trimmed; length `1` to `MAX_NAME_LENGTH = 20`; ASCII control characters (`U+0000` to `U+001F` and `U+007F`) rejected. Validated in `onAuth`, so an invalid name is refused with a `400` before the player enters the world. |
| Chat message | Must be a string; trimmed; non-empty; at most `MAX_MESSAGE_LENGTH = 500` characters. |
| Movement input | Coerced to exactly four booleans; any other shape becomes idle. |

The same validators run on the client for instant feedback, but the server's copy is authoritative.

## LiveKit Token Least-Privilege

When voice is configured, the server mints a per-player LiveKit access token (`issueLiveKitToken`) with a deliberately minimal grant:

| Grant | Value | Why |
|-------|-------|-----|
| `identity` | the Colyseus `sessionId` | Audio peers map 1:1 to world avatars; proximity can address them directly |
| `room` | the single shared room | The token cannot join any other room |
| `roomJoin` | `true` | Needed to connect |
| `canPublish` | `true` | Needed to speak |
| `canPublishSources` | `[MICROPHONE]` | Microphone only, no camera, no screen share |
| `canSubscribe` | `true` | Needed to hear peers |
| `canPublishData` | `false` | No arbitrary data channel |

So even a leaked or replayed token can, at worst, publish a microphone into one room, never a camera, screen, or data. The token has a 12h TTL (it outlives any realistic session and LiveKit reuses it on reconnect). Tokens are issued fire-and-forget after join: a signing failure disables voice for that one client and is logged server-side, but never fails the join. See [ADR-004](../adr/004-audio-only-voice.md).

## Opt-In Voice

Voice only exists when `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET` are all set. Without them the server issues no token and the client shows no voice UI. The microphone is requested only on an explicit user gesture ("Enable voice"); the client connects with `autoSubscribe: false` and subscribes only to nearby peers, so it never pulls audio it does not want. On permission denial the client stays connected listen-only rather than retrying against the user's wishes.

## No Secrets in the Client

The client bundle contains no secrets. It never sees `LIVEKIT_API_KEY` or `LIVEKIT_API_SECRET`; it only receives a short-lived, scoped token and the public `wss://` LiveKit URL at runtime, inside the audio-token message. The client also never hardcodes the server address, deriving the same-origin `/colyseus` endpoint from `window.location`.

## Secret Management in Deployment

- The server reads all secrets from the environment at startup (`config.ts`); nothing is hardcoded.
- `PORT` is validated at boot, and an invalid value refuses to start.
- In the [homelab](https://github.com/mateuseap/homelab) cluster, LiveKit credentials are stored as **sealed secrets**: encrypted in the GitOps repository and decrypted only inside the cluster, so no plaintext credential is ever committed. See the [Deployment Guide](../deployment/setup.md).

## Reporting Security Issues

Do not open a public issue for a security vulnerability. Email `mateuseap@mateuseap.com` with details.

## Known Limitations / Future Work

| Item | Status |
|------|--------|
| Message content moderation / profanity filtering | Not implemented |
| Per-account (not per-session) abuse controls | Not implemented; anonymous sessions only |
| Persistent identity / authentication | Not implemented; players join with a display name only |
| Video / screen share | Intentionally out of scope for v1 (audio-only, see [ADR-004](../adr/004-audio-only-voice.md)) |
