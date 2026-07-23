import Phaser from 'phaser';
import {
  IDLE_INPUT,
  MessageType,
  PROXIMITY_RADIUS,
  TILE_SIZE,
  createWorldMap,
  isWithinProximity,
  stepPlayer,
  type MovementInput,
  type Position,
} from '@pixelhub/shared';
import type { Room } from 'colyseus.js';
import { playersOf, type RemotePlayerState } from '../net/roomState';
import { PlayerSprite } from './PlayerSprite';
import { TEXTURE_WORLD, createAvatarTexture, createWorldTexture } from './textures';

interface TrackedPlayer {
  readonly sprite: PlayerSprite;
  target: Position;
  readonly isLocal: boolean;
}

const inputsEqual = (a: MovementInput, b: MovementInput): boolean =>
  a.up === b.up && a.down === b.down && a.left === b.left && a.right === b.right;

export class WorldScene extends Phaser.Scene {
  private readonly room: Room;
  private readonly map = createWorldMap();
  private readonly players = new Map<string, TrackedPlayer>();
  private keys: Record<string, Phaser.Input.Keyboard.Key> = {};
  private lastSent: MovementInput = IDLE_INPUT;
  private predicted: Position | null = null;

  constructor(room: Room) {
    super('world');
    this.room = room;
  }

  create(): void {
    createWorldTexture(this);
    createAvatarTexture(this);
    this.add.image(0, 0, TEXTURE_WORLD).setOrigin(0, 0);

    const worldW = this.map.width * TILE_SIZE;
    const worldH = this.map.height * TILE_SIZE;
    this.cameras.main.setBounds(0, 0, worldW, worldH);
    this.cameras.main.setBackgroundColor('#14151f');

    const keyboard = this.input.keyboard;
    if (keyboard) {
      // Keep browser defaults (e.g. arrows inside the chat input) working.
      keyboard.disableGlobalCapture();
      this.keys = keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as Record<
        string,
        Phaser.Input.Keyboard.Key
      >;
    }

    const players = playersOf(this.room);
    players.onAdd((player, sessionId) => this.addPlayer(player, sessionId));
    players.onRemove((_player, sessionId) => this.removePlayer(sessionId));
  }

  update(_time: number, dtMs: number): void {
    const input = this.readInput();
    if (!inputsEqual(input, this.lastSent)) {
      this.room.send(MessageType.Input, input);
      this.lastSent = input;
    }

    const smoothing = 1 - Math.exp(-dtMs * 0.012);
    this.players.forEach((tracked) => {
      if (tracked.isLocal) {
        this.updateLocal(tracked, input, dtMs);
      } else {
        const x = Phaser.Math.Linear(tracked.sprite.x, tracked.target.x, smoothing);
        const y = Phaser.Math.Linear(tracked.sprite.y, tracked.target.y, smoothing);
        tracked.sprite.setPosition(x, y);
      }
    });
  }

  /** Names of other players within chat proximity of the local player. */
  getNearbyNames(): readonly string[] {
    const local = this.players.get(this.room.sessionId);
    if (!local) {
      return [];
    }
    const names: string[] = [];
    playersOf(this.room).forEach((player, sessionId) => {
      if (sessionId === this.room.sessionId) {
        return;
      }
      if (isWithinProximity(local.target, { x: player.x, y: player.y }, PROXIMITY_RADIUS)) {
        names.push(player.name);
      }
    });
    return names;
  }

  showBubbleFor(sessionId: string, text: string): void {
    this.players.get(sessionId)?.sprite.showBubble(text);
  }

  private updateLocal(tracked: TrackedPlayer, input: MovementInput, dtMs: number): void {
    const current = this.predicted ?? tracked.target;
    const stepped = stepPlayer(this.map, current, input, dtMs);
    // Gentle server correction keeps prediction honest without rubber-banding.
    const correction = 1 - Math.exp(-dtMs * 0.004);
    this.predicted = {
      x: Phaser.Math.Linear(stepped.x, tracked.target.x, correction),
      y: Phaser.Math.Linear(stepped.y, tracked.target.y, correction),
    };
    tracked.sprite.setPosition(this.predicted.x, this.predicted.y);
  }

  private addPlayer(player: RemotePlayerState, sessionId: string): void {
    const isLocal = sessionId === this.room.sessionId;
    const sprite = new PlayerSprite(this, player.x, player.y, player.name, player.color);
    const tracked: TrackedPlayer = { sprite, target: { x: player.x, y: player.y }, isLocal };
    this.players.set(sessionId, tracked);

    player.listen('x', (x) => {
      tracked.target = { ...tracked.target, x };
    });
    player.listen('y', (y) => {
      tracked.target = { ...tracked.target, y };
    });

    if (isLocal) {
      this.predicted = { x: player.x, y: player.y };
      this.cameras.main.startFollow(sprite.container, true, 0.12, 0.12);
    }
  }

  private removePlayer(sessionId: string): void {
    this.players.get(sessionId)?.sprite.destroy();
    this.players.delete(sessionId);
  }

  private readInput(): MovementInput {
    const active = document.activeElement;
    if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) {
      return IDLE_INPUT;
    }
    const k = this.keys;
    const down = (name: string): boolean => k[name]?.isDown === true;
    return {
      up: down('W') || down('UP'),
      down: down('S') || down('DOWN'),
      left: down('A') || down('LEFT'),
      right: down('D') || down('RIGHT'),
    };
  }
}
