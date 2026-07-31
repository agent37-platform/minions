import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import {
  isActiveWorker,
  observeWorkerInputErrors,
} from '../server/adapters/hermes-worker.js';

const input = new PassThrough();
const expected = Object.assign(new Error('broken pipe'), { code: 'EPIPE' });
let observed: Error | null = null;

observeWorkerInputErrors(input, (error) => {
  observed = error;
});
input.emit('error', expected);

assert.equal(observed, expected);

const oldWorker = { id: 'old' };
const newWorker = { id: 'new' };
assert.equal(isActiveWorker(newWorker, oldWorker), false);
assert.equal(isActiveWorker(newWorker, newWorker), true);
console.log('Worker crash resilience tests passed');
