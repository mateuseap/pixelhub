import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FakeRoom, RoomEvent } from './fakeLivekit';

vi.mock('livekit-client', () => import('./fakeLivekit'));

import { NO_VOICE, VoiceManager, type VoiceStatus } from '../src/audio/voiceManager';

const CREDENTIALS = { token: 'jwt-token', url: 'wss://livekit.example.com' };

interface Harness {
  readonly manager: VoiceManager;
  readonly statuses: VoiceStatus[];
  readonly details: (string | undefined)[];
  readonly onPeersChanged: ReturnType<typeof vi.fn>;
}

function createHarness(withCredentials = true): Harness {
  const statuses: VoiceStatus[] = [];
  const details: (string | undefined)[] = [];
  const onPeersChanged = vi.fn();
  const manager = new VoiceManager({
    onStatusChanged: (status, detail) => {
      statuses.push(status);
      details.push(detail);
    },
    onPeersChanged,
  });
  if (withCredentials) {
    manager.setCredentials(CREDENTIALS);
  }
  return { manager, statuses, details, onPeersChanged };
}

function permissionDenied(): DOMException {
  return new DOMException('Permission denied', 'NotAllowedError');
}

beforeEach(() => {
  document.body.innerHTML = '';
  FakeRoom.reset();
});

describe('VoiceManager availability', () => {
  it('is unavailable until credentials arrive', () => {
    const { manager } = createHarness(false);
    expect(manager.available).toBe(false);
    manager.setCredentials(CREDENTIALS);
    expect(manager.available).toBe(true);
  });

  it('ignores toggle when no credentials are set', async () => {
    const { manager, statuses } = createHarness(false);
    await manager.toggle();
    expect(manager.status).toBe('off');
    expect(statuses).toEqual([]);
    expect(FakeRoom.instances).toHaveLength(0);
  });
});

describe('VoiceManager toggle state machine', () => {
  it('goes off -> connecting -> live on first toggle', async () => {
    const { manager, statuses } = createHarness();
    await manager.toggle();
    expect(statuses).toEqual(['connecting', 'live']);
    expect(manager.status).toBe('live');
  });

  it('connects with the server credentials and autoSubscribe disabled', async () => {
    const { manager } = createHarness();
    await manager.toggle();
    expect(FakeRoom.last.connect).toHaveBeenCalledWith(CREDENTIALS.url, CREDENTIALS.token, {
      autoSubscribe: false,
    });
    expect(FakeRoom.last.localParticipant.setMicrophoneEnabled).toHaveBeenCalledWith(true);
  });

  it('mutes when live and unmutes when muted on subsequent toggles', async () => {
    const { manager, statuses } = createHarness();
    await manager.toggle();
    await manager.toggle();
    expect(manager.status).toBe('muted');
    await manager.toggle();
    expect(manager.status).toBe('live');
    expect(statuses).toEqual(['connecting', 'live', 'muted', 'live']);
    // Mute reuses the same room; nothing reconnects.
    expect(FakeRoom.instances).toHaveLength(1);
    expect(FakeRoom.last.connect).toHaveBeenCalledTimes(1);
  });

  it('ignores toggles while connecting', async () => {
    const { manager, statuses } = createHarness();
    const first = manager.toggle();
    await manager.toggle(); // status is 'connecting' here
    await first;
    expect(statuses).toEqual(['connecting', 'live']);
    expect(FakeRoom.instances).toHaveLength(1);
  });

  it('notifies peer listeners when the mic state settles', async () => {
    const { manager, onPeersChanged } = createHarness();
    await manager.toggle();
    expect(onPeersChanged).toHaveBeenCalled();
  });
});

describe('VoiceManager permission denied', () => {
  it('reports the permission message and stays connected listen-only', async () => {
    const { manager, statuses, details } = createHarness();
    FakeRoom.micError = permissionDenied();
    await manager.toggle();
    expect(manager.status).toBe('error');
    expect(statuses).toEqual(['connecting', 'error']);
    expect(details[1]).toBe(
      'Microphone permission denied. Allow the mic in your browser and try again.',
    );
    // The room is kept so the player still hears nearby peers.
    expect(FakeRoom.last.disconnect).not.toHaveBeenCalled();
  });

  it('stays usable: a later toggle can still go live', async () => {
    const { manager } = createHarness();
    FakeRoom.micError = permissionDenied();
    await manager.toggle();
    expect(manager.status).toBe('error');
    await manager.toggle();
    expect(manager.status).toBe('live');
    // No second room was created for the retry.
    expect(FakeRoom.instances).toHaveLength(1);
  });

  it('reports a generic error and tears down on non-permission connect failures', async () => {
    const { manager, statuses, details } = createHarness();
    FakeRoom.connectError = new Error('network down');
    await manager.toggle();
    expect(manager.status).toBe('error');
    expect(statuses).toEqual(['connecting', 'off', 'error']);
    expect(details[statuses.indexOf('error')]).toBe(
      'Could not connect to voice. Try again in a moment.',
    );
    expect(FakeRoom.last.disconnect).toHaveBeenCalled();
  });
});

describe('VoiceManager restore', () => {
  it("restore('live') connects and publishes the microphone", async () => {
    const { manager, statuses } = createHarness();
    await manager.restore('live');
    expect(manager.status).toBe('live');
    expect(statuses).toEqual(['connecting', 'live']);
    expect(FakeRoom.last.localParticipant.setMicrophoneEnabled).toHaveBeenCalledWith(true);
  });

  it("restore('muted') connects without ever touching the microphone", async () => {
    const { manager, statuses } = createHarness();
    await manager.restore('muted');
    expect(manager.status).toBe('muted');
    expect(statuses).toEqual(['connecting', 'muted']);
    expect(FakeRoom.last.connect).toHaveBeenCalledWith(CREDENTIALS.url, CREDENTIALS.token, {
      autoSubscribe: false,
    });
    expect(FakeRoom.last.localParticipant.setMicrophoneEnabled).not.toHaveBeenCalled();
  });

  it('does nothing without credentials', async () => {
    const { manager, statuses } = createHarness(false);
    await manager.restore('live');
    expect(manager.status).toBe('off');
    expect(statuses).toEqual([]);
    expect(FakeRoom.instances).toHaveLength(0);
  });

  it('does nothing when voice is already active', async () => {
    const { manager } = createHarness();
    await manager.toggle();
    await manager.restore('muted');
    expect(manager.status).toBe('live');
    expect(FakeRoom.instances).toHaveLength(1);
  });

  it("falls back to off when restore('muted') cannot connect", async () => {
    const { manager, statuses } = createHarness();
    FakeRoom.connectError = new Error('network down');
    await manager.restore('muted');
    expect(manager.status).toBe('off');
    expect(statuses[0]).toBe('connecting');
    expect(statuses[statuses.length - 1]).toBe('off');
  });
});

describe('VoiceManager applyProximity', () => {
  it('subscribes only in-range identities and applies their gains', async () => {
    const { manager } = createHarness();
    await manager.toggle();
    const room = FakeRoom.last;
    const near = room.addRemoteParticipant('near', { subscribed: false });
    const far = room.addRemoteParticipant('far', { subscribed: true });

    manager.applyProximity([{ identity: 'near', gain: 0.5 }]);

    const nearPub = near.audioTrackPublications.get('microphone');
    const farPub = far.audioTrackPublications.get('microphone');
    expect(nearPub?.setSubscribed).toHaveBeenCalledWith(true);
    expect(near.setVolume).toHaveBeenCalledWith(0.5);
    expect(farPub?.setSubscribed).toHaveBeenCalledWith(false);
    expect(far.setVolume).not.toHaveBeenCalled();
  });

  it('does not resubscribe a publication already in the wanted state', async () => {
    const { manager } = createHarness();
    await manager.toggle();
    const room = FakeRoom.last;
    const near = room.addRemoteParticipant('near', { subscribed: true });

    manager.applyProximity([{ identity: 'near', gain: 1 }]);

    expect(near.audioTrackPublications.get('microphone')?.setSubscribed).not.toHaveBeenCalled();
    expect(near.setVolume).toHaveBeenCalledWith(1);
  });

  it('is a safe no-op before the room is connected', () => {
    const { manager } = createHarness();
    expect(() => manager.applyProximity([{ identity: 'a', gain: 1 }])).not.toThrow();
  });

  it('re-applies the last proximity set when a peer publishes a new track', async () => {
    const { manager } = createHarness();
    await manager.toggle();
    manager.applyProximity([{ identity: 'near', gain: 0.8 }]);
    const room = FakeRoom.last;
    const near = room.addRemoteParticipant('near', { subscribed: false });

    room.emit(RoomEvent.TrackPublished);

    expect(near.audioTrackPublications.get('microphone')?.setSubscribed).toHaveBeenCalledWith(true);
    expect(near.setVolume).toHaveBeenCalledWith(0.8);
  });
});

describe('VoiceManager disconnect handling', () => {
  it('flags an unexpected Disconnected event as a reconnectable error', async () => {
    const { manager, statuses, details, onPeersChanged } = createHarness();
    await manager.toggle();
    onPeersChanged.mockClear();

    FakeRoom.last.emit(RoomEvent.Disconnected);

    expect(manager.status).toBe('error');
    expect(statuses).toEqual(['connecting', 'live', 'error']);
    expect(details[2]).toBe('Voice disconnected. Click to reconnect.');
    expect(onPeersChanged).toHaveBeenCalled();
  });

  it('ignores the Disconnected event fired by an intentional teardown', async () => {
    const { manager, statuses } = createHarness();
    await manager.toggle();
    const room = FakeRoom.last;
    await manager.disconnect();

    room.emit(RoomEvent.Disconnected);

    expect(manager.status).toBe('off');
    expect(statuses).toEqual(['connecting', 'live', 'off']);
  });

  it('tracks Reconnecting and Reconnected events', async () => {
    const { manager } = createHarness();
    await manager.toggle();
    const room = FakeRoom.last;

    room.emit(RoomEvent.Reconnecting);
    expect(manager.status).toBe('reconnecting');

    // Toggle is inert while reconnecting.
    await manager.toggle();
    expect(manager.status).toBe('reconnecting');

    room.emit(RoomEvent.Reconnected);
    expect(manager.status).toBe('live');
  });
});

describe('VoiceManager peer views', () => {
  it('returns NO_VOICE for the local player before connecting', () => {
    const { manager } = createHarness();
    expect(manager.getLocalState()).toEqual(NO_VOICE);
    expect(manager.getPeerStates().size).toBe(0);
  });

  it('reflects the local mic in getLocalState', async () => {
    const { manager } = createHarness();
    await manager.toggle();
    expect(manager.getLocalState()).toEqual({ inVoice: true, muted: false, speaking: false });
    await manager.toggle();
    expect(manager.getLocalState()).toEqual({ inVoice: true, muted: true, speaking: false });
  });

  it('exposes remote mic and speaking state per identity', async () => {
    const { manager } = createHarness();
    await manager.toggle();
    const room = FakeRoom.last;
    room.addRemoteParticipant('talker', { muted: false, speaking: true });
    room.addRemoteParticipant('mutedPeer', { muted: true });
    room.addRemoteParticipant('silent', { withMic: false });

    const states = manager.getPeerStates();
    expect(states.get('talker')).toEqual({ inVoice: true, muted: false, speaking: true });
    expect(states.get('mutedPeer')).toEqual({ inVoice: true, muted: true, speaking: false });
    expect(states.get('silent')).toEqual({ inVoice: false, muted: false, speaking: false });
  });
});
