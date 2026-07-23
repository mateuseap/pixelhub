import {
  EMPTY_RATE_LIMIT,
  IDLE_INPUT,
  MAX_CLIENTS,
  MessageType,
  SPAWN_POINTS,
  TICK_RATE,
  TILE_SIZE,
  checkRateLimit,
  createWorldMap,
  filterChatRecipients,
  sanitizeInput,
  stepPlayer,
  validateChatMessage,
  validateDisplayName,
  type ChatBroadcast,
  type ChatError,
  type JoinOptions,
  type MovementInput,
  type Position,
  type RateLimitState,
  type WorldMap,
  PLAYER_COLORS,
} from '@pixelhub/shared';
import { Client, Room, ServerError } from 'colyseus';
import { Player, WorldState } from './schema/WorldState';

/** Per-session server-side bookkeeping (never synced to clients). */
interface SessionData {
  readonly input: MovementInput;
  readonly chatLimit: RateLimitState;
}

export class WorldRoom extends Room<WorldState> {
  maxClients = MAX_CLIENTS;

  private readonly map: WorldMap = createWorldMap();
  private sessions = new Map<string, SessionData>();
  private joinCounter = 0;

  onCreate(): void {
    this.setState(new WorldState());

    this.onMessage(MessageType.Input, (client, payload: unknown) => {
      this.handleInput(client, payload);
    });
    this.onMessage(MessageType.Chat, (client, payload: unknown) => {
      this.handleChat(client, payload);
    });

    this.setSimulationInterval((dtMs) => this.update(dtMs), 1000 / TICK_RATE);
  }

  onAuth(_client: Client, options: JoinOptions): { name: string } {
    const result = validateDisplayName(options?.name);
    if (!result.ok) {
      throw new ServerError(400, result.error);
    }
    return { name: result.value };
  }

  onJoin(client: Client, _options?: JoinOptions, auth?: { name: string }): void {
    if (!auth) {
      throw new ServerError(500, 'Missing auth data.');
    }
    const spawn = this.spawnPosition(this.joinCounter);
    const color = PLAYER_COLORS[this.joinCounter % PLAYER_COLORS.length];
    this.joinCounter += 1;

    const player = new Player();
    player.name = auth.name;
    player.color = color;
    player.x = spawn.x;
    player.y = spawn.y;
    this.state.players.set(client.sessionId, player);

    this.sessions.set(client.sessionId, { input: IDLE_INPUT, chatLimit: EMPTY_RATE_LIMIT });
  }

  onLeave(client: Client): void {
    this.state.players.delete(client.sessionId);
    this.sessions.delete(client.sessionId);
  }

  /** One simulation tick. Public so tests can drive it deterministically. */
  update(dtMs: number): void {
    this.state.players.forEach((player, sessionId) => {
      const session = this.sessions.get(sessionId);
      if (!session) {
        return;
      }
      const next = stepPlayer(this.map, { x: player.x, y: player.y }, session.input, dtMs);
      player.x = next.x;
      player.y = next.y;
    });
  }

  private handleInput(client: Client, payload: unknown): void {
    const session = this.sessions.get(client.sessionId);
    if (!session) {
      return;
    }
    this.sessions.set(client.sessionId, { ...session, input: sanitizeInput(payload) });
  }

  private handleChat(client: Client, payload: unknown): void {
    const session = this.sessions.get(client.sessionId);
    const sender = this.state.players.get(client.sessionId);
    if (!session || !sender) {
      return;
    }

    const text = typeof payload === 'object' && payload !== null
      ? (payload as { text?: unknown }).text
      : undefined;
    const validated = validateChatMessage(text);
    if (!validated.ok) {
      this.sendChatError(client, validated.error);
      return;
    }

    const limit = checkRateLimit(session.chatLimit, Date.now());
    this.sessions.set(client.sessionId, { ...session, chatLimit: limit.state });
    if (!limit.allowed) {
      this.sendChatError(client, 'You are sending messages too fast. Wait a few seconds.');
      return;
    }

    const roster: ReadonlyArray<readonly [string, Position]> = [...this.state.players.entries()].map(
      ([id, p]) => [id, { x: p.x, y: p.y }] as const,
    );
    const recipients = new Set(filterChatRecipients({ x: sender.x, y: sender.y }, roster));

    const message: ChatBroadcast = {
      senderId: client.sessionId,
      senderName: sender.name,
      text: validated.value,
      sentAt: Date.now(),
    };
    for (const target of this.clients) {
      if (recipients.has(target.sessionId)) {
        target.send(MessageType.Chat, message);
      }
    }
  }

  private sendChatError(client: Client, reason: string): void {
    const error: ChatError = { reason };
    client.send(MessageType.ChatError, error);
  }

  private spawnPosition(index: number): Position {
    const [tx, ty] = SPAWN_POINTS[index % SPAWN_POINTS.length];
    return {
      x: tx * TILE_SIZE + TILE_SIZE / 2,
      y: ty * TILE_SIZE + TILE_SIZE / 2,
    };
  }
}
