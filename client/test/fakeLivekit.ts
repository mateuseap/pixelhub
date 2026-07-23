import { vi } from 'vitest';

/**
 * Controllable in-memory stand-in for the parts of livekit-client that
 * VoiceManager touches. Tests import FakeRoom to inspect instances and to
 * script connect/microphone failures; the module itself is wired in via
 * vi.mock('livekit-client', () => import('./fakeLivekit')).
 */

export const ConnectionState = {
  Disconnected: 'disconnected',
  Connecting: 'connecting',
  Connected: 'connected',
  Reconnecting: 'reconnecting',
} as const;

export const RoomEvent = {
  TrackSubscribed: 'trackSubscribed',
  TrackUnsubscribed: 'trackUnsubscribed',
  TrackPublished: 'trackPublished',
  TrackUnpublished: 'trackUnpublished',
  TrackMuted: 'trackMuted',
  TrackUnmuted: 'trackUnmuted',
  ActiveSpeakersChanged: 'activeSpeakersChanged',
  ParticipantConnected: 'participantConnected',
  ParticipantDisconnected: 'participantDisconnected',
  AudioPlaybackStatusChanged: 'audioPlaybackChanged',
  Reconnecting: 'reconnecting',
  Reconnected: 'reconnected',
  Disconnected: 'disconnected',
} as const;

export const Track = {
  Kind: { Audio: 'audio', Video: 'video' },
  Source: { Microphone: 'microphone' },
} as const;

export class FakeRemotePublication {
  isSubscribed: boolean;
  isMuted: boolean;
  readonly setSubscribed = vi.fn((wanted: boolean): void => {
    this.isSubscribed = wanted;
  });

  constructor(options: { subscribed?: boolean; muted?: boolean } = {}) {
    this.isSubscribed = options.subscribed ?? false;
    this.isMuted = options.muted ?? false;
  }
}

export class FakeRemoteParticipant {
  readonly identity: string;
  isSpeaking = false;
  volume: number | undefined;
  readonly audioTrackPublications = new Map<string, FakeRemotePublication>();
  readonly setVolume = vi.fn((value: number): void => {
    this.volume = value;
  });

  constructor(identity: string) {
    this.identity = identity;
  }

  getTrackPublication(source: string): FakeRemotePublication | undefined {
    return this.audioTrackPublications.get(source);
  }
}

export class FakeLocalParticipant {
  isMicrophoneEnabled = false;
  isSpeaking = false;
  readonly audioTrackPublications = new Map<string, { isMuted: boolean }>();

  readonly setMicrophoneEnabled = vi.fn(async (enabled: boolean): Promise<void> => {
    const error = FakeRoom.micError;
    if (error !== null) {
      FakeRoom.micError = null;
      throw error;
    }
    this.isMicrophoneEnabled = enabled;
    if (enabled) {
      this.audioTrackPublications.set(Track.Source.Microphone, { isMuted: false });
    }
  });
}

type Handler = (...args: unknown[]) => void;

export class FakeRoom {
  /** Every Room constructed since the last reset, oldest first. */
  static instances: FakeRoom[] = [];
  /** When set, the next connect() rejects with this value. */
  static connectError: unknown = null;
  /** When set, the next setMicrophoneEnabled() rejects with this value. */
  static micError: unknown = null;

  static reset(): void {
    FakeRoom.instances = [];
    FakeRoom.connectError = null;
    FakeRoom.micError = null;
  }

  static get last(): FakeRoom {
    const room = FakeRoom.instances[FakeRoom.instances.length - 1];
    if (!room) {
      throw new Error('No FakeRoom has been constructed yet.');
    }
    return room;
  }

  state: string = ConnectionState.Disconnected;
  canPlaybackAudio = true;
  readonly localParticipant = new FakeLocalParticipant();
  readonly remoteParticipants = new Map<string, FakeRemoteParticipant>();
  private readonly handlers = new Map<string, Handler[]>();

  readonly connect = vi.fn(async (): Promise<void> => {
    const error = FakeRoom.connectError;
    if (error !== null) {
      FakeRoom.connectError = null;
      throw error;
    }
    this.state = ConnectionState.Connected;
  });

  readonly disconnect = vi.fn(async (): Promise<void> => {
    this.state = ConnectionState.Disconnected;
  });

  readonly startAudio = vi.fn(async (): Promise<void> => {});

  constructor() {
    FakeRoom.instances = [...FakeRoom.instances, this];
  }

  on(event: string, handler: Handler): this {
    this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]);
    return this;
  }

  emit(event: string, ...args: unknown[]): void {
    (this.handlers.get(event) ?? []).forEach((handler) => handler(...args));
  }

  addRemoteParticipant(
    identity: string,
    options: { subscribed?: boolean; muted?: boolean; speaking?: boolean; withMic?: boolean } = {},
  ): FakeRemoteParticipant {
    const participant = new FakeRemoteParticipant(identity);
    participant.isSpeaking = options.speaking ?? false;
    if (options.withMic !== false) {
      participant.audioTrackPublications.set(
        Track.Source.Microphone,
        new FakeRemotePublication(options),
      );
    }
    this.remoteParticipants.set(identity, participant);
    return participant;
  }
}

export { FakeRoom as Room };
