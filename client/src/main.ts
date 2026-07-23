import Phaser from 'phaser';
import { MessageType, type ChatBroadcast, type ChatError } from '@pixelhub/shared';
import type { Room } from 'colyseus.js';
import { WorldScene } from './game/WorldScene';
import { joinWorld } from './net/connection';
import { setupChatPanel } from './ui/chatPanel';
import { setupJoinScreen } from './ui/joinScreen';

const NEARBY_REFRESH_MS = 300;

function startGame(room: Room): void {
  const scene = new WorldScene(room);

  new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#14151f',
    scale: {
      mode: Phaser.Scale.RESIZE,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene,
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
