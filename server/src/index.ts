import { listen } from '@colyseus/tools';
import app from './app.config';
import { loadConfig } from './config';

async function main(): Promise<void> {
  const config = loadConfig();
  await listen(app, config.port);
  // eslint-disable-next-line no-console
  console.info(`pixelhub server listening on :${config.port}`);
}

main().catch((error: unknown) => {
  // eslint-disable-next-line no-console
  console.error('Fatal: failed to start pixelhub server', error);
  process.exit(1);
});
