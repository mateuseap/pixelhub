import { DEFAULT_PORT } from '@pixelhub/shared';

export interface LiveKitConfig {
  readonly url: string;
  readonly apiKey: string;
  readonly apiSecret: string;
}

export interface ServerConfig {
  readonly port: number;
  /** Present only when proximity audio (M3) is configured. */
  readonly livekit: LiveKitConfig | null;
}

/** Reads configuration from the environment. Secrets are never hardcoded. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const rawPort = env.PORT ?? String(DEFAULT_PORT);
  const port = Number.parseInt(rawPort, 10);
  if (Number.isNaN(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT: ${rawPort}`);
  }

  // TODO(M3 — proximity audio): when LIVEKIT_* are set, the server will issue
  // LiveKit access tokens scoped per room/participant. See src/audio/livekit.ts.
  const livekit =
    env.LIVEKIT_URL && env.LIVEKIT_API_KEY && env.LIVEKIT_API_SECRET
      ? { url: env.LIVEKIT_URL, apiKey: env.LIVEKIT_API_KEY, apiSecret: env.LIVEKIT_API_SECRET }
      : null;

  return { port, livekit };
}
