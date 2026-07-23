import { COLYSEUS_PATH, ROOM_NAME } from '@pixelhub/shared';
import { Client, type Room } from 'colyseus.js';

/**
 * Same-origin Colyseus endpoint: ws(s)://<host>/colyseus. In dev, Vite
 * proxies it; in production, nginx proxies it to the server service.
 */
export function buildEndpoint(loc: Pick<Location, 'protocol' | 'host'> = window.location): string {
  const scheme = loc.protocol === 'https:' ? 'wss' : 'ws';
  return `${scheme}://${loc.host}${COLYSEUS_PATH}`;
}

export async function joinWorld(name: string): Promise<Room> {
  const client = new Client(buildEndpoint());
  return client.joinOrCreate(ROOM_NAME, { name });
}
