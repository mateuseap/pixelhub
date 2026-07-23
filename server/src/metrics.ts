/**
 * Prometheus metrics for the world server. Intentionally tiny: a handful of
 * hand-picked series (no default process metrics) so the scrape cost on the
 * shared 1 vCPU host stays negligible.
 */
import { Counter, Gauge, Registry } from 'prom-client';

export const registry = new Registry();

export const playersConnected = new Gauge({
  name: 'pixelhub_players_connected',
  help: 'Players currently connected to the world',
  registers: [registry],
});

export const playersJoinedTotal = new Counter({
  name: 'pixelhub_players_joined_total',
  help: 'Total player joins since server start',
  registers: [registry],
});

export const chatMessagesTotal = new Counter({
  name: 'pixelhub_chat_messages_total',
  help: 'Total proximity chat messages delivered',
  registers: [registry],
});

export const voiceTokensIssuedTotal = new Counter({
  name: 'pixelhub_voice_tokens_issued_total',
  help: 'Total LiveKit voice tokens issued',
  registers: [registry],
});
