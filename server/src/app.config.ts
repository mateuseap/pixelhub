import { ROOM_NAME } from '@pixelhub/shared';
import config from '@colyseus/tools';
import { registry } from './metrics';
import { WorldRoom } from './rooms/WorldRoom';

export default config({
  initializeGameServer: (gameServer) => {
    gameServer.define(ROOM_NAME, WorldRoom);
  },

  initializeExpress: (app) => {
    app.get('/health', (_req, res) => {
      res.json({ status: 'ok' });
    });

    app.get('/metrics', (_req, res) => {
      registry
        .metrics()
        .then((body) => {
          res.set('Content-Type', registry.contentType);
          res.send(body);
        })
        .catch(() => {
          res.status(500).send('metrics collection failed');
        });
    });
  },
});
