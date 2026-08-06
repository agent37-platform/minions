import assert from 'node:assert/strict';
import type { Response } from 'express';
import { addClient, broadcast as broadcastBoard } from '../server/events.js';
import { broadcast as broadcastLive, subscribe } from '../server/live-chat.js';

// A connected SSE client whose socket buffer is full. Node returns false from
// res.write() to signal backpressure — the connection is still open and the
// client is still reading, just slowly. Treating that as a disconnect strands
// the browser on a stream that never emits again (EventSource only reconnects
// when the connection actually closes).
function backpressuredClient() {
  const frames: string[] = [];
  const res = {
    write(chunk: string): boolean {
      frames.push(chunk);
      return false;
    },
    on(): unknown {
      return res;
    },
  };
  return { frames, res: res as unknown as Response };
}

const TASK_ID = 'task-under-backpressure';
const live = backpressuredClient();
subscribe(TASK_ID, live.res);

broadcastLive(TASK_ID, { type: 'text_delta', content: 'one' });
broadcastLive(TASK_ID, { type: 'text_delta', content: 'two' });
broadcastLive(TASK_ID, { type: 'done' });

assert.equal(live.frames.length, 3, 'live-chat subscriber must survive backpressure');
assert.match(live.frames[2], /"type":"done"/);

const board = backpressuredClient();
addClient(board.res);

broadcastBoard({ type: 'task_deleted', taskId: 'first' });
broadcastBoard({ type: 'task_deleted', taskId: 'second' });

assert.equal(board.frames.length, 2, 'board client must survive backpressure');
assert.match(board.frames[1], /"taskId":"second"/);

console.log('SSE backpressure tests passed');

// The SSE keepalive intervals stay armed while a client is registered, so the
// event loop would otherwise hold this process open for the full interval.
process.exit(0);
