# ADR-004: Audio-Only Voice (No Video)

**Status:** Accepted
**Date:** 2026-07-01

## Context

PixelHub's proximity model ([ADR-003](./003-proximity-model.md)) applies naturally to both voice and video: you could imagine seeing a webcam tile for anyone standing near you. The question is whether v1 should carry video at all. The deciding factor is the host: a single shared **1 vCPU / 4 GB VPS** in the [homelab](https://github.com/mateuseap/homelab) cluster, shared with other apps, targeting roughly 10 to 15 concurrent users.

## Decision

**Voice is audio-only. There is no video and no screen share in v1.** The self-hosted LiveKit SFU routes Opus audio tracks and nothing else.

### Why audio-only fits a 1 vCPU host

Even though LiveKit is a Selective Forwarding Unit and does not transcode by default, video changes the cost profile on every axis that matters for a tiny host:

- **Bandwidth.** A single 720p video stream is on the order of 1 to 2 Mbps; an Opus voice track is roughly 40 kbps. Video is one to two orders of magnitude more data per participant, multiplied by every subscriber in range.
- **Connection and packet overhead.** More tracks and higher packet rates mean more per-connection work in the SFU, which is precisely the CPU we do not have to spare.
- **Client cost.** Decoding several simultaneous video tiles is expensive on the low-end devices this project targets, competing with the Phaser render loop.

Dropping video keeps the SFU comfortably inside the host's budget while still delivering the feature that makes a proximity space feel alive: hearing the people around you.

### How voice is scoped and transported

- **Opt-in per deployment.** Voice only exists when the server is configured with `LIVEKIT_URL`, `LIVEKIT_API_KEY`, and `LIVEKIT_API_SECRET`. Without them the world runs silently, the server sends no token, and the client shows no voice UI at all. Zero behavior change for a voiceless deployment.
- **Scoped tokens.** On join the server mints a per-player LiveKit access token with `livekit-server-sdk`. Identity is the Colyseus sessionId (so audio peers map 1:1 to world avatars), and the grant is least-privilege: join the one shared room, publish audio only (`canPublishSources` is microphone only), subscribe to others, and never publish data. See the [Security](../security/security.md) doc for the full grant.
- **One room, client-side audibility.** Every player joins a single LiveKit room. Who you actually hear is a client-side subscription decision driven by server-authoritative proximity (`computeAudioPeers` from [ADR-003](./003-proximity-model.md)): the client subscribes only to peers in range and sets each one's volume to its distance gain.
- **User gesture required.** The microphone is only requested when the player clicks "Enable voice." The client publishes audio-only, and the choice persists across refresh (the browser re-asks for the mic only if permission was granted one time).

## Consequences

- The SFU stays within the CPU and bandwidth budget of a shared 1 vCPU host at the target user count.
- Voice is entirely optional infrastructure: deployments without LiveKit credentials are unaffected.
- Least-privilege audio-only tokens mean a leaked or replayed token can, at worst, publish a microphone, never a camera or arbitrary data.
- Video, screen share, and spatial stereo are explicitly deferred to a later milestone (M5+), to be revisited only on more capable hardware.
