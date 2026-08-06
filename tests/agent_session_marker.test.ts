import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.MINIONS_HOME = mkdtempSync(join(tmpdir(), 'minions-session-marker-'));

const { insertTask, markAgentSessionStarted } = await import('../server/db/queries.js');

const task = insertTask({ title: 'first turn', status: 'in_progress' });
assert.equal(task.agent_session_started_at, null);

const marked = markAgentSessionStarted(task.id);
assert.equal(typeof marked?.agent_session_started_at, 'number');

const markedAgain = markAgentSessionStarted(task.id);
assert.equal(
  markedAgain?.agent_session_started_at,
  marked?.agent_session_started_at,
  'session marker should preserve the first run timestamp',
);

console.log('Agent session marker tests passed');
