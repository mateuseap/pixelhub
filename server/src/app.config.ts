import { ROOM_NAME } from '@pixelhub/shared';
import config from '@colyseus/tools';
import { WorldRoom } from './rooms/WorldRoom';

export default config({
  initializeGameServer: (gameServer) => {
    gameServer.define(ROOM_NAME, WorldRoom);
  },

  initializeExpress: (app) => {
    app.get('/health', (_req, res) => {
      res.json({ status: 'ok' });
    });
  },
});
