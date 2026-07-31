import assert from 'node:assert/strict';
import express from 'express';
import { createServer } from 'node:http';
import { mkdtemp, mkdir, readFile, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const home = await mkdtemp(join(tmpdir(), 'minions-routes-test-'));
const workspace = join(home, 'workspace');
const outside = join(home, 'outside');
await mkdir(workspace, { recursive: true });
await mkdir(outside);
await writeFile(join(workspace, 'inside.txt'), 'before');
await writeFile(join(outside, 'secret.txt'), 'secret');
await symlink(outside, join(workspace, 'escape'));
process.env.MINIONS_HOME = home;

const { filesRouter } = await import('../server/routes/files.js');
const app = express();
app.use('/api/files', express.json({ limit: '25mb' }), filesRouter);
const server = createServer(app);
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
assert(address && typeof address === 'object');
const base = `http://127.0.0.1:${address.port}/api/files`;

try {
  const root = await fetch(`${base}/list?path=.`);
  assert.equal(root.status, 200);
  const rootBody = await root.json() as { parentPath: string | null; path: string };
  assert.equal(rootBody.path, workspace);
  assert.equal(rootBody.parentPath, null);

  const outsideRead = await fetch(`${base}/read?path=${encodeURIComponent(join(outside, 'secret.txt'))}`);
  assert.equal(outsideRead.status, 403);
  assert.equal((await outsideRead.json() as { code: string }).code, 'PATH_OUTSIDE_WORKSPACE');

  const symlinkRead = await fetch(`${base}/read?path=${encodeURIComponent(join(workspace, 'escape', 'secret.txt'))}`);
  assert.equal(symlinkRead.status, 403);

  const write = await fetch(`${base}/write`, {
    method: 'PUT',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ path: join(workspace, 'inside.txt'), content: 'after' }),
  });
  assert.equal(write.status, 200);
  assert.equal(await readFile(join(workspace, 'inside.txt'), 'utf8'), 'after');

  const traversalCreate = await fetch(`${base}/create`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ parentPath: '../outside', name: 'created.txt', type: 'file' }),
  });
  assert.equal(traversalCreate.status, 403);
} finally {
  await new Promise<void>((resolve) => server.close(() => resolve()));
}

console.log('Filesystem route security tests passed');
