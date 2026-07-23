# ADR-002: Server-Authoritative Movement

**Status:** Accepted
**Date:** 2026-07-01

## Context

Movement is the core interaction in PixelHub, and it drives everything else: who can chat with whom and who can hear whom both depend on player positions. If the client were trusted to report its own position, a modified client could teleport, walk through walls, or place itself next to any player to eavesdrop on proximity chat and voice. The question is where the authoritative position of each avatar lives.

## Decision

The **server is the sole authority** for every player's position. Clients never send positions. They send only a directional intent, and the server integrates it.

### Flow

1. The client reads the keyboard each frame and sends a `MovementInput` (`{up, down, left, right}` booleans) over the Colyseus message channel, but only when the intent changes, not every frame.
2. The server sanitizes the payload into a safe `MovementInput` (`sanitizeInput` coerces anything untrusted into four booleans) and stores it as that session's current intent.
3. On every simulation tick the server advances each player from its own authoritative position using `stepPlayer(map, pos, input, dt)`: it normalizes the direction (diagonals are not faster), clamps to the world bounds, and resolves each axis independently against the tile collision map so players slide along walls but never enter them.
4. The new position is written to the Colyseus schema state, which binary-encodes the delta and syncs it to every client.

The server integrator is a pure function from the shared package, so no movement value ever originates on the client.

### Tick Rate

The simulation runs at **`TICK_RATE = 20`** ticks per second (a 50 ms step), driven by Colyseus `setSimulationInterval`. Twenty ticks per second is a deliberate balance:

- Fast enough that movement feels responsive once the client interpolates between updates.
- Slow enough that a single 1 vCPU host comfortably simulates a full room (`MAX_CLIENTS = 16`) and encodes state deltas without saturating the core.

### Client Prediction and Interpolation

A pure 20 Hz server feed would look choppy and would lag the local player behind their own keypresses. The client hides this without ever becoming authoritative:

- **Local player: prediction.** The client runs the exact same `stepPlayer` on the local avatar each rendered frame using the shared package, so the player moves the instant a key is pressed. Each frame the prediction is gently eased toward the latest server position (`predicted = lerp(stepped, serverTarget, smallFactor)`). Because both sides run identical code, the correction is tiny and there is no rubber-banding.
- **Remote players: interpolation.** Other avatars are smoothly interpolated toward their last synced position each frame, turning the 20 Hz stream into fluid motion.

The important property is that prediction and interpolation are presentation only. The server position always wins, and the shared integrator guarantees the client's prediction and the server's authority agree by construction.

## Consequences

- A tampered client cannot move illegally: the worst it can do is send intent booleans, which the server validates against walls and bounds anyway.
- Proximity chat and voice are trustworthy because they are computed from server-authoritative positions, never from client claims (see [ADR-003](./003-proximity-model.md)).
- Movement code lives once in `@pixelhub/shared` and is exercised by both prediction and authority, so the two can never silently diverge.
- The 20 Hz tick and 16-client cap are sized for a 1 vCPU host; raising either raises CPU and bandwidth cost per room.
