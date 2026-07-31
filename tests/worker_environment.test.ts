import assert from 'node:assert/strict';
import { buildWorkerEnvironment } from '../server/adapters/hermes-worker.js';

const safe = buildWorkerEnvironment({ HERMES_YOLO_MODE: '1' });
assert.equal(safe.HERMES_QUIET, '1');
assert.equal(safe.HERMES_YOLO_MODE, '0');

const enabled = buildWorkerEnvironment({ MINIONS_YOLO: 'true' });
assert.equal(enabled.HERMES_YOLO_MODE, '1');

assert.throws(
  () => buildWorkerEnvironment({ MINIONS_YOLO: 'maybe' }),
  /MINIONS_YOLO/i,
);

console.log('Worker environment security tests passed');
