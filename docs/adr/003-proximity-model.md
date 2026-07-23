# ADR-003: Proximity Model for Chat and Voice

**Status:** Accepted
**Date:** 2026-07-01

## Context

The whole point of PixelHub is that proximity is the interface: you walk up to someone to talk, and you walk away to leave. That intuition has to be turned into concrete rules for two channels, text chat and voice, both driven by the same server-authoritative positions established in [ADR-002](./002-server-authoritative-movement.md). The rules have to be simple, deterministic, cheap to compute for a full room on a 1 vCPU host, and identical wherever they run.

## Decision

A single radius constant, **`PROXIMITY_RADIUS = 5`** tiles, defines "nearby" for both channels. Distance is Euclidean, measured in tiles: `tileDistance(a, b) = hypot(a.x - b.x, a.y - b.y) / TILE_SIZE`. All proximity math lives in `@pixelhub/shared` as pure functions.

### Text chat: a hard 5-tile cutoff, filtered server-side

Chat delivery is binary. A message reaches a player if and only if they are within 5 tiles of the sender.

1. A client sends a chat message. The server validates and rate-limits it (see [ADR-002](./002-server-authoritative-movement.md) and the [Security](../security/security.md) doc).
2. The server calls `filterChatRecipients(senderPos, roster)` over the current roster of authoritative positions. It returns the set of session ids within `PROXIMITY_RADIUS` of the sender (the sender itself qualifies at distance 0).
3. The server sends the message only to clients in that recipient set. Out-of-range players never receive the payload at all.

Filtering on the server, not the client, is what makes the cutoff a real privacy boundary rather than a display choice: a modified client cannot receive messages it was never sent.

### Voice: a linear distance falloff inside the same radius

Voice uses the same radius but a graded, not binary, model, because abrupt on/off audio is jarring. `audioGainForDistance(distance)` returns a playback gain in [0, 1]:

- **Full volume (gain 1.0)** from 0 up to `FULL_GAIN_RADIUS = 1` tile, so people standing together hear each other clearly.
- **Linear falloff** from 1 tile out to the radius: `gain = (radius - distance) / (radius - fullGain)`.
- **Silent (gain 0)** at or beyond `PROXIMITY_RADIUS`.

`computeAudioPeers(listener, peers)` maps this over every other player and keeps only those with gain greater than 0. Each surviving peer carries its identity (the Colyseus sessionId) and its gain. The client runs this every 300 ms and, for each peer, subscribes or unsubscribes to its LiveKit audio track and sets the participant volume to the computed gain. See [ADR-004](./004-audio-only-voice.md) for how the audio itself is transported.

### Why the same radius for both

Using one constant for chat and voice keeps the mental model honest: the set of people you can talk to by text is the same set you can (at some volume) hear. It also means one tuning knob governs the whole "conversation bubble," and the shared implementation guarantees the client's idea of "nearby" for the on-screen nearby list matches the server's idea for chat delivery.

## Consequences

- Chat privacy is enforced by server-side recipient filtering, so out-of-range clients cannot receive or reconstruct messages.
- Voice audibility degrades smoothly with distance, which reads as natural spatial audio without any per-peer manual controls.
- All proximity decisions are O(n) per event over a room capped at 16 players, which is trivial on the target host.
- The behavior is deterministic and pure, so it is exhaustively unit-tested in the shared package (distance, cutoff, and gain-curve edge cases).
- Both channels are only as trustworthy as the positions they read, which is exactly why positions are server-authoritative.
