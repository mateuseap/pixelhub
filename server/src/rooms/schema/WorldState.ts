import { MapSchema, Schema, type } from '@colyseus/schema';

/**
 * Synchronized player state. Colyseus schemas are mutable by design. This is
 * the one place where in-place updates are the framework contract.
 */
export class Player extends Schema {
  @type('string') name = '';
  @type('string') color = '';
  @type('number') x = 0;
  @type('number') y = 0;
}

export class WorldState extends Schema {
  @type({ map: Player }) players = new MapSchema<Player>();
}
