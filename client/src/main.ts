import Phaser from 'phaser';
import { MessageType, type ChatBroadcast, type ChatError } from '@pixelhub/shared';
import type { Room } from 'colyseus.js';
import { WorldScene } from './game/WorldScene';
import { joinWorld } from './net/connection';
import { setupChatPanel } from './ui/chatPanel';
import { setupJoinScreen } from './ui/joinScreen';

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
}

setupJoinScreen({
  onJoin: async (name) => {
    const room = await joinWorld(name);
    startGame(room);
  },
});
