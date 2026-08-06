import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { mkdtempSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const stateDir = mkdtempSync(join(tmpdir(), 'minions-file-api-state-'));
const outsideDir = mkdtempSync(join(tmpdir(), 'minions-file-api-outside-'));
const outsideFile = join(outsideDir, 'secret.txt');
process.env.MINIONS_HOME = stateDir;

writeFileSync(outsideFile, 'secret');

const app = (await import('../server/app.js')).default;
const { resolveMinionsWorkspaceDir } = await import('../server/paths.js');

const workspace = resolveMinionsWorkspaceDir();
symlinkSync(outsideFile, join(workspace, 'secret-link'));

const server = createServer(app);
await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
assert(address && typeof address === 'object');
const base = `http://127.0.0.1:${address.port}/api`;

try {
  const outsideRead = await fetch(`${base}/files/read?path=${encodeURIComponent(outsideFile)}`);
  assert.equal(outsideRead.status, 403);

  const symlinkRead = await fetch(`${base}/files/read?path=${encodeURIComponent(join(workspace, 'secret-link'))}`);
  assert.equal(symlinkRead.status, 403);

  const crossOrigin = await fetch(`${base}/files/list`, {
    headers: { Origin: 'https://example.com' },
  });
  assert.equal(crossOrigin.status, 403);

  console.log('File API confinement tests passed');
} finally {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
}
