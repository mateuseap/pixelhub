/** A 2D position in pixel coordinates. */
export interface Position {
  readonly x: number;
  readonly y: number;
}

/** Directional movement intent sent by the client. */
export interface MovementInput {
  readonly up: boolean;
  readonly down: boolean;
  readonly left: boolean;
  readonly right: boolean;
}

export const IDLE_INPUT: MovementInput = {
  up: false,
  down: false,
  left: false,
  right: false,
};

/** Options a client sends when joining the world room. */
export interface JoinOptions {
  readonly name?: unknown;
}

/** A chat message broadcast by the server to players in range. */
export interface ChatBroadcast {
  readonly senderId: string;
  readonly senderName: string;
  readonly text: string;
  readonly sentAt: number;
}

/** Error payload sent back to a client whose chat message was refused. */
export interface ChatError {
  readonly reason: string;
}

/** Message types exchanged over the Colyseus room. */
export const MessageType = {
  Input: 'input',
  Chat: 'chat',
  ChatError: 'chat-error',
} as const;

export type MessageTypeValue = (typeof MessageType)[keyof typeof MessageType];
