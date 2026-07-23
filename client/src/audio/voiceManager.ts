import type { AudioPeer, AudioTokenPayload } from '@pixelhub/shared';
import {
  ConnectionState,
  Room,
  RoomEvent,
  Track,
  type RemoteParticipant,
  type RemoteTrack,
  type RemoteTrackPublication,
} from 'livekit-client';

/** Lifecycle of the local microphone, driven by the voice toggle button. */
export type VoiceStatus = 'off' | 'connecting' | 'live' | 'muted' | 'reconnecting' | 'error';

/** What the world needs to know about one participant's voice, for avatars. */
export interface VoicePeerView {
  readonly inVoice: boolean;
  readonly muted: boolean;
  readonly speaking: boolean;
}

export const NO_VOICE: VoicePeerView = { inVoice: false, muted: false, speaking: false };

interface VoiceManagerCallbacks {
  readonly onStatusChanged: (status: VoiceStatus, detail?: string) => void;
  readonly onPeersChanged: () => void;
}

const PERMISSION_DENIED_MESSAGE =
  'Microphone permission denied. Allow the mic in your browser and try again.';

function isPermissionDenied(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError')
  );
}

/**
 * Wraps a LiveKit room for proximity voice. Everyone shares one SFU room;
 * this class decides who is audible by subscribing only to peers the caller
 * marks in range, and scales each peer's volume by its distance gain.
 */
export class VoiceManager {
  private readonly callbacks: VoiceManagerCallbacks;
  private readonly sink: HTMLElement;
  private credentials: AudioTokenPayload | null = null;
  private room: Room | null = null;
  private currentStatus: VoiceStatus = 'off';
  private lastPeers: readonly AudioPeer[] = [];

  constructor(callbacks: VoiceManagerCallbacks) {
    this.callbacks = callbacks;
    this.sink = document.createElement('div');
    this.sink.style.display = 'none';
    document.body.appendChild(this.sink);
  }

  /** Called when the server sends LiveKit credentials after join. */
  setCredentials(payload: AudioTokenPayload): void {
    this.credentials = payload;
  }

  get available(): boolean {
    return this.credentials !== null;
  }

  get status(): VoiceStatus {
    return this.currentStatus;
  }

  /** One button drives everything: enable, then mute/unmute. */
  async toggle(): Promise<void> {
    if (this.currentStatus === 'connecting' || this.currentStatus === 'reconnecting') {
      return;
    }
    if (this.currentStatus === 'live') {
      await this.setMicEnabled(false);
      return;
    }
    if (this.currentStatus === 'muted') {
      await this.setMicEnabled(true);
      return;
    }
    await this.enable();
  }

  /**
   * Applies the proximity set: subscribe to peers in range, unsubscribe the
   * rest, and set per-peer playback volume to the distance gain.
   */
  applyProximity(peers: readonly AudioPeer[]): void {
    this.lastPeers = peers;
    const room = this.room;
    if (!room || room.state !== ConnectionState.Connected) {
      return;
    }
    const gains = new Map(peers.map((peer) => [peer.identity, peer.gain] as const));
    room.remoteParticipants.forEach((participant, identity) => {
      const gain = gains.get(identity);
      participant.audioTrackPublications.forEach((publication) => {
        const wanted = gain !== undefined;
        if (publication.isSubscribed !== wanted) {
          publication.setSubscribed(wanted);
        }
      });
      if (gain !== undefined) {
        participant.setVolume(gain);
      }
    });
  }

  /** Voice view of every remote participant, keyed by identity (sessionId). */
  getPeerStates(): ReadonlyMap<string, VoicePeerView> {
    const states = new Map<string, VoicePeerView>();
    const room = this.room;
    if (!room || room.state !== ConnectionState.Connected) {
      return states;
    }
    room.remoteParticipants.forEach((participant, identity) => {
      const mic = this.micPublication(participant);
      states.set(identity, {
        inVoice: mic !== undefined,
        muted: mic?.isMuted === true,
        speaking: participant.isSpeaking,
      });
    });
    return states;
  }

  /** Voice view of the local player, for its own avatar indicators. */
  getLocalState(): VoicePeerView {
    const room = this.room;
    if (!room || room.state !== ConnectionState.Connected) {
      return NO_VOICE;
    }
    const local = room.localParticipant;
    const published = local.audioTrackPublications.size > 0;
    return {
      inVoice: published,
      muted: published && !local.isMicrophoneEnabled,
      speaking: local.isSpeaking,
    };
  }

  /** Tears voice down (world disconnect); safe to call repeatedly. */
  async disconnect(): Promise<void> {
    const room = this.room;
    this.room = null;
    this.setStatus('off');
    if (room) {
      await room.disconnect();
    }
  }

  private async enable(): Promise<void> {
    const credentials = this.credentials;
    if (!credentials) {
      return;
    }
    this.setStatus('connecting');
    try {
      if (!this.room) {
        this.room = this.createRoom();
        await this.room.connect(credentials.url, credentials.token, { autoSubscribe: false });
        this.applyProximity(this.lastPeers);
      }
      await this.setMicEnabled(true);
    } catch (error: unknown) {
      if (isPermissionDenied(error)) {
        // Stay connected listen-only: the player still hears nearby peers.
        this.setStatus('error', PERMISSION_DENIED_MESSAGE);
        return;
      }
      await this.disconnect();
      this.setStatus('error', 'Could not connect to voice. Try again in a moment.');
    }
  }

  private async setMicEnabled(enabled: boolean): Promise<void> {
    const room = this.room;
    if (!room) {
      return;
    }
    try {
      await room.localParticipant.setMicrophoneEnabled(enabled);
      this.setStatus(enabled ? 'live' : 'muted');
      this.callbacks.onPeersChanged();
    } catch (error: unknown) {
      if (isPermissionDenied(error)) {
        this.setStatus('error', PERMISSION_DENIED_MESSAGE);
        return;
      }
      throw error;
    }
  }

  private createRoom(): Room {
    const room = new Room();

    room
      .on(RoomEvent.TrackSubscribed, (track: RemoteTrack) => {
        if (track.kind === Track.Kind.Audio) {
          this.sink.appendChild(track.attach());
        }
        this.callbacks.onPeersChanged();
      })
      .on(RoomEvent.TrackUnsubscribed, (track: RemoteTrack) => {
        track.detach().forEach((element) => element.remove());
        this.callbacks.onPeersChanged();
      })
      .on(RoomEvent.TrackPublished, () => {
        // A peer just enabled voice: re-run the last proximity set so its
        // new track gets subscribed without waiting for the next tick.
        this.applyProximity(this.lastPeers);
        this.callbacks.onPeersChanged();
      })
      .on(RoomEvent.TrackUnpublished, () => this.callbacks.onPeersChanged())
      .on(RoomEvent.TrackMuted, () => this.callbacks.onPeersChanged())
      .on(RoomEvent.TrackUnmuted, () => this.callbacks.onPeersChanged())
      .on(RoomEvent.ActiveSpeakersChanged, () => this.callbacks.onPeersChanged())
      .on(RoomEvent.ParticipantConnected, () => this.callbacks.onPeersChanged())
      .on(RoomEvent.ParticipantDisconnected, () => this.callbacks.onPeersChanged())
      .on(RoomEvent.Reconnecting, () => this.setStatus('reconnecting'))
      .on(RoomEvent.Reconnected, () => {
        this.setStatus(room.localParticipant.isMicrophoneEnabled ? 'live' : 'muted');
        this.applyProximity(this.lastPeers);
      })
      .on(RoomEvent.Disconnected, () => {
        if (this.room !== room) {
          return; // Intentional teardown via disconnect().
        }
        this.room = null;
        this.setStatus('error', 'Voice disconnected. Click to reconnect.');
        this.callbacks.onPeersChanged();
      });

    return room;
  }

  private micPublication(participant: RemoteParticipant): RemoteTrackPublication | undefined {
    return participant.getTrackPublication(Track.Source.Microphone) as
      | RemoteTrackPublication
      | undefined;
  }

  private setStatus(status: VoiceStatus, detail?: string): void {
    this.currentStatus = status;
    this.callbacks.onStatusChanged(status, detail);
  }
}
