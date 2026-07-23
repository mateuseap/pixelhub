import { boot, type ColyseusTestServer } from '@colyseus/testing';
import {
  MAX_MESSAGE_LENGTH,
  MessageType,
  PLAYER_HITBOX,
  ROOM_NAME,
  TILE_SIZE,
  type AudioTokenPayload,
  type ChatBroadcast,
  type ChatError,
} from '@pixelhub/shared';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import appConfig from '../src/app.config';
import type { WorldState } from '../src/rooms/schema/WorldState';
import { collectMessages, sleep, waitForMessage } from './helpers';

describe('WorldRoom', () => {
  let colyseus: ColyseusTestServer;

  beforeAll(async () => {
    colyseus = await boot(appConfig);
  });
  afterAll(async () => {
    await colyseus.shutdown();
  });
  afterEach(async () => {
    await colyseus.cleanup();
  });

  const idle = { up: false, down: false, left: false, right: false };

  async function createRoomWithPlayers(names: readonly string[]) {
    const room = await colyseus.createRoom<WorldState>(ROOM_NAME, {});
    const clients = [];
    for (const name of names) {
      clients.push(await colyseus.connectTo(room, { name }));
    }
    await room.waitForNextPatch();
    return { room, clients };
  }

  function placeAt(
    room: Awaited<ReturnType<typeof colyseus.createRoom<WorldState>>>,
    sessionId: string,
    tx: number,
    ty: number,
  ): void {
    const player = room.state.players.get(sessionId);
    if (!player) {
      throw new Error(`No player for session ${sessionId}`);
    }
    player.x = tx * TILE_SIZE + TILE_SIZE / 2;
    player.y = ty * TILE_SIZE + TILE_SIZE / 2;
  }

  describe('joining', () => {
    it('spawns a player with name, color, and a walkable position', async () => {
      const { room, clients } = await createRoomWithPlayers(['Alice']);
      const player = room.state.players.get(clients[0].sessionId);
      expect(player).toBeDefined();
      expect(player?.name).toBe('Alice');
      expect(player?.color).toMatch(/^#[0-9a-f]{6}$/i);
      expect(player?.x).toBeGreaterThan(TILE_SIZE);
      expect(player?.y).toBeGreaterThan(TILE_SIZE);
    });

    it('trims the display name', async () => {
      const { room, clients } = await createRoomWithPlayers(['  Bob  ']);
      expect(room.state.players.get(clients[0].sessionId)?.name).toBe('Bob');
    });

    it('rejects an empty name', async () => {
      const room = await colyseus.createRoom<WorldState>(ROOM_NAME, {});
      await expect(colyseus.connectTo(room, { name: '   ' })).rejects.toThrow();
    });

    it('rejects a missing name', async () => {
      const room = await colyseus.createRoom<WorldState>(ROOM_NAME, {});
      await expect(colyseus.connectTo(room, {})).rejects.toThrow();
    });

    it('rejects an over-long name', async () => {
      const room = await colyseus.createRoom<WorldState>(ROOM_NAME, {});
      await expect(colyseus.connectTo(room, { name: 'x'.repeat(50) })).rejects.toThrow();
    });

    it('assigns distinct colors to the first players', async () => {
      const { room, clients } = await createRoomWithPlayers(['A', 'B']);
      const c0 = room.state.players.get(clients[0].sessionId)?.color;
      const c1 = room.state.players.get(clients[1].sessionId)?.color;
      expect(c0).not.toBe(c1);
    });

    it('removes the player on leave', async () => {
      const { room, clients } = await createRoomWithPlayers(['A', 'B']);
      await clients[0].leave();
      await room.waitForNextPatch();
      expect(room.state.players.has(clients[0].sessionId)).toBe(false);
      expect(room.state.players.has(clients[1].sessionId)).toBe(true);
    });
  });

  describe('movement', () => {
    it('moves a player right on input, server-side', async () => {
      const { room, clients } = await createRoomWithPlayers(['Alice']);
      const player = room.state.players.get(clients[0].sessionId);
      const x0 = player?.x ?? 0;
      const y0 = player?.y ?? 0;

      clients[0].send(MessageType.Input, { ...idle, right: true });
      await room.waitForMessage(MessageType.Input);
      await sleep(250);
      clients[0].send(MessageType.Input, idle);

      expect(player?.x ?? 0).toBeGreaterThan(x0);
      expect(player?.y ?? 0).toBeCloseTo(y0, 0);
    });

    it('blocks movement through walls', async () => {
      const { room, clients } = await createRoomWithPlayers(['Alice']);
      // Tile (1, 10) is open floor flush against the left border wall.
      placeAt(room, clients[0].sessionId, 1, 10);

      clients[0].send(MessageType.Input, { ...idle, left: true });
      await room.waitForMessage(MessageType.Input);
      await sleep(400);

      const minX = TILE_SIZE + PLAYER_HITBOX / 2;
      expect(room.state.players.get(clients[0].sessionId)?.x ?? 0).toBeGreaterThanOrEqual(
        minX - 0.01,
      );
    });

    it('ignores malformed input payloads', async () => {
      const { room, clients } = await createRoomWithPlayers(['Alice']);
      const player = room.state.players.get(clients[0].sessionId);
      const x0 = player?.x ?? 0;

      clients[0].send(MessageType.Input, { right: 'yes', up: 1, nested: { hack: true } });
      await room.waitForMessage(MessageType.Input);
      await sleep(200);

      expect(player?.x ?? 0).toBe(x0);
    });
  });

  describe('proximity chat', () => {
    it('delivers messages to players in range (including the sender) only', async () => {
      const { room, clients } = await createRoomWithPlayers(['Sender', 'Near', 'Far']);
      placeAt(room, clients[0].sessionId, 10, 10);
      placeAt(room, clients[1].sessionId, 12, 10); // 2 tiles away
      placeAt(room, clients[2].sessionId, 30, 25); // ~25 tiles away

      const senderMsg = waitForMessage<ChatBroadcast>(clients[0], MessageType.Chat);
      const nearMsg = waitForMessage<ChatBroadcast>(clients[1], MessageType.Chat);
      const farMsgs = collectMessages<ChatBroadcast>(clients[2], MessageType.Chat, 600);

      clients[0].send(MessageType.Chat, { text: 'hello neighbors' });

      const received = await nearMsg;
      expect(received.text).toBe('hello neighbors');
      expect(received.senderName).toBe('Sender');
      expect(received.senderId).toBe(clients[0].sessionId);

      await expect(senderMsg).resolves.toMatchObject({ text: 'hello neighbors' });
      expect(await farMsgs).toHaveLength(0);
    });

    it('trims messages and rejects empty ones', async () => {
      const { clients } = await createRoomWithPlayers(['Alice']);
      const error = waitForMessage<ChatError>(clients[0], MessageType.ChatError);
      clients[0].send(MessageType.Chat, { text: '    ' });
      await expect(error).resolves.toMatchObject({ reason: expect.stringContaining('empty') });
    });

    it('rejects messages over the length limit', async () => {
      const { clients } = await createRoomWithPlayers(['Alice']);
      const error = waitForMessage<ChatError>(clients[0], MessageType.ChatError);
      clients[0].send(MessageType.Chat, { text: 'a'.repeat(MAX_MESSAGE_LENGTH + 1) });
      await expect(error).resolves.toMatchObject({
        reason: expect.stringContaining(String(MAX_MESSAGE_LENGTH)),
      });
    });

    it('rejects non-object chat payloads', async () => {
      const { clients } = await createRoomWithPlayers(['Alice']);
      const error = waitForMessage<ChatError>(clients[0], MessageType.ChatError);
      clients[0].send(MessageType.Chat, 'raw string');
      await expect(error).resolves.toMatchObject({ reason: expect.any(String) });
    });

    it('rate-limits to 5 messages per 5 seconds', async () => {
      const { clients } = await createRoomWithPlayers(['Spammer']);
      const chats = collectMessages<ChatBroadcast>(clients[0], MessageType.Chat, 800);
      const errors = collectMessages<ChatError>(clients[0], MessageType.ChatError, 800);

      for (let i = 0; i < 7; i += 1) {
        clients[0].send(MessageType.Chat, { text: `spam ${i}` });
      }

      expect(await chats).toHaveLength(5);
      expect((await errors).length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('voice tokens', () => {
    it('does not send audio tokens when LiveKit is not configured', async () => {
      const room = await colyseus.createRoom<WorldState>(ROOM_NAME, {});
      const client = await colyseus.connectTo(room, { name: 'Quiet' });
      const tokens = await collectMessages<AudioTokenPayload>(
        client,
        MessageType.AudioToken,
        400,
      );
      expect(tokens).toHaveLength(0);
    });

    it('sends LiveKit credentials after join when LIVEKIT_* are set', async () => {
      process.env.LIVEKIT_URL = 'wss://livekit.example.test';
      process.env.LIVEKIT_API_KEY = 'test-api-key';
      process.env.LIVEKIT_API_SECRET = 'test-api-secret-0123456789abcdef0123456789abcdef';
      try {
        const room = await colyseus.createRoom<WorldState>(ROOM_NAME, {});
        const client = await colyseus.connectTo(room, { name: 'Talker' });
        const payload = await waitForMessage<AudioTokenPayload>(
          client,
          MessageType.AudioToken,
        );
        expect(payload.url).toBe('wss://livekit.example.test');
        expect(payload.token.split('.')).toHaveLength(3);
        const claims = JSON.parse(
          Buffer.from(payload.token.split('.')[1], 'base64url').toString('utf8'),
        ) as { sub?: string; video?: { room?: string } };
        expect(claims.sub).toBe(client.sessionId);
        expect(claims.video?.room).toBe(ROOM_NAME);
      } finally {
        delete process.env.LIVEKIT_URL;
        delete process.env.LIVEKIT_API_KEY;
        delete process.env.LIVEKIT_API_SECRET;
      }
    });

  });
});
