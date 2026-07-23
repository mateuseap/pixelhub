import type { Room } from 'colyseus.js';

/** Shape of a synced player as decoded by colyseus.js reflection. */
export interface RemotePlayerState {
  readonly name: string;
  readonly color: string;
  readonly x: number;
  readonly y: number;
  listen(field: 'x' | 'y', cb: (value: number) => void): void;
}

interface PlayersMap {
  onAdd(cb: (player: RemotePlayerState, sessionId: string) => void): void;
  onRemove(cb: (player: RemotePlayerState, sessionId: string) => void): void;
  forEach(cb: (player: RemotePlayerState, sessionId: string) => void): void;
  get(sessionId: string): RemotePlayerState | undefined;
}

/** Typed accessor for the world room's `players` map. */
export function playersOf(room: Room): PlayersMap {
  return (room.state as { players: PlayersMap }).players;
}
