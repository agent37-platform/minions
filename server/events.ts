import type { Response } from 'express';
import type { BoardEvent } from '../shared/types.js';

export type { BoardEvent };

const clients = new Set<Response>();

const KEEPALIVE_INTERVAL_MS = 30_000;
let keepaliveTimer: ReturnType<typeof setInterval> | null = null;

function startKeepalive() {
  if (keepaliveTimer) return;
  keepaliveTimer = setInterval(() => {
    for (const client of clients) {
      try { client.write(':keepalive\n\n'); } catch { clients.delete(client); }
    }
    if (clients.size === 0) {
      clearInterval(keepaliveTimer!);
      keepaliveTimer = null;
    }
  }, KEEPALIVE_INTERVAL_MS);
}

export function initSSE(res: Response): void {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();
}

export function addClient(res: Response) {
  clients.add(res);
  res.on('close', () => clients.delete(res));
  startKeepalive();
}

// A `false` return from res.write() means backpressure, not a dead client, so it
// must not be used to drop the client — the board would silently stop updating
// on a connection that is still open. Real disconnects arrive on the 'close'
// handler in addClient().
function writeEvent(res: Response, event: BoardEvent): void {
  try {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  } catch {
    // Socket already torn down — 'close' has fired or is about to.
  }
}

export function sendEvent(res: Response, event: BoardEvent): void {
  writeEvent(res, event);
}

export function broadcast(event: BoardEvent) {
  for (const client of clients) writeEvent(client, event);
}
