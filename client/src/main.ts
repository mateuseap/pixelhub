import Phaser from 'phaser';
import {
  MessageType,
  computeAudioPeers,
  type AudioTokenPayload,
  type ChatBroadcast,
  type ChatError,
  type Position,
} from '@pixelhub/shared';
import type { Room } from 'colyseus.js';
import { VoiceManager } from './audio/voiceManager';
import { WorldScene } from './game/WorldScene';
import { joinWorld } from './net/connection';
import { playersOf } from './net/roomState';
import { setupChatPanel } from './ui/chatPanel';
import { setupJoinScreen } from './ui/joinScreen';
import { setupVoiceControls } from './ui/voiceControls';

const NEARBY_REFRESH_MS = 300;

/**
 * The game renders at half resolution and is scaled up 2x with nearest
 * neighbor filtering. Pixel art looks right chunky, and the GPU pushes 4x
 * fewer fragments per frame, which is what keeps weak iGPUs at 60 fps.
 */
const RENDER_ZOOM = 2;

function startGame(room: Room): void {
  const scene = new WorldScene(room);

  const parent = document.getElementById('game');
  if (!parent) {
    throw new Error('Missing required element #game');
  }
  const viewSize = (): { width: number; height: number } => ({
    width: Math.max(160, Math.floor(parent.clientWidth / RENDER_ZOOM)),
    height: Math.max(120, Math.floor(parent.clientHeight / RENDER_ZOOM)),
  });

  const initial = viewSize();
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    banner: false,
    backgroundColor: '#17131d',
    pixelArt: true,
    render: { powerPreference: 'high-performance' },
    scale: {
      mode: Phaser.Scale.NONE,
      zoom: RENDER_ZOOM,
      width: initial.width,
      height: initial.height,
    },
    scene,
  });

  let resizeQueued = false;
  window.addEventListener('resize', () => {
    if (resizeQueued) {
      return;
    }
    resizeQueued = true;
    requestAnimationFrame(() => {
      resizeQueued = false;
      const next = viewSize();
      game.scale.resize(next.width, next.height);
    });
  });

  const chat = setupChatPanel({
    onSend: (text) => room.send(MessageType.Chat, { text }),
  });
  chat.show();

  room.onMessage(MessageType.Chat, (message: ChatBroadcast) => {
    chat.addMessage(message, message.senderId === room.sessionId);
    scene.showBubbleFor(message.senderId, message.text);
  });
  room.onMessage(MessageType.ChatError, (error: ChatError) => {
    chat.addSystem(error.reason);
  });
  room.onError((_code, message) => {
    chat.addSystem(`Connection error: ${message ?? 'unknown'}`);
  });
  room.onLeave(() => {
    chat.addSystem('Disconnected from the world. Refresh to rejoin.');
  });

  window.setInterval(() => {
    chat.setNearby(scene.getNearbyNames());
  }, NEARBY_REFRESH_MS);

  setupVoice(room, scene);
}

/**
 * Wires proximity voice: the server sends LiveKit credentials only when
 * voice is configured, so a voiceless deployment never shows the UI.
 */
/** Remembers the player's voice choice across page refreshes. */
const VOICE_PREF_KEY = 'pixelhub-voice';

function setupVoice(room: Room, scene: WorldScene): void {
  const applySpeakingStates = (): void => {
    const speaking = new Set<string>();
    voice.getPeerStates().forEach((view, identity) => {
      if (view.speaking) {
        speaking.add(identity);
      }
    });
    if (voice.getLocalState().speaking) {
      speaking.add(room.sessionId);
    }
    scene.applySpeaking(speaking);
  };

  const controls = setupVoiceControls({
    onToggle: () => {
      void voice.toggle();
    },
  });
  const voice = new VoiceManager({
    onStatusChanged: (status, detail) => {
      controls.setStatus(status, detail);
      if (status === 'live' || status === 'muted') {
        localStorage.setItem(VOICE_PREF_KEY, status);
      }
    },
    onPeersChanged: applySpeakingStates,
  });

  room.onMessage(MessageType.AudioToken, (payload: AudioTokenPayload) => {
    voice.setCredentials(payload);
    controls.show();
    controls.setStatus('off');
    // Rejoin voice automatically when the player had it on before a refresh.
    // The mic permission dialog only reappears if the browser was told to
    // allow it one time only.
    const pref = localStorage.getItem(VOICE_PREF_KEY);
    if (pref === 'live' || pref === 'muted') {
      void voice.restore(pref);
    }
  });
  room.onLeave(() => {
    void voice.disconnect();
  });

  window.setInterval(() => {
    if (!voice.available) {
      return;
    }
    const players = playersOf(room);
    const localPlayer = players.get(room.sessionId);
    if (!localPlayer) {
      return;
    }
    const listener: Position = { x: localPlayer.x, y: localPlayer.y };
    const peers: Array<readonly [string, Position]> = [];
    players.forEach((player, sessionId) => {
      if (sessionId !== room.sessionId) {
        peers.push([sessionId, { x: player.x, y: player.y }] as const);
      }
    });
    voice.applyProximity(computeAudioPeers(listener, peers));
    applySpeakingStates();
  }, NEARBY_REFRESH_MS);
}

setupJoinScreen({
  onJoin: async (name) => {
    const room = await joinWorld(name);
    startGame(room);
  },
});
