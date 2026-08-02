import assert from 'node:assert/strict';
import { mkdtemp, mkdir, realpath, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  resolveExistingSandboxPath,
  resolveSandboxDestination,
} from '../server/filesystem-sandbox.js';

const base = await mkdtemp(join(tmpdir(), 'minions-sandbox-test-'));
const root = join(base, 'workspace');
const outside = join(base, 'outside');
await mkdir(root);
await mkdir(outside);
await writeFile(join(root, 'inside.txt'), 'safe');
await writeFile(join(outside, 'secret.txt'), 'secret');
await symlink(outside, join(root, 'escape'));

assert.equal(
  await resolveExistingSandboxPath(root, join(root, 'inside.txt')),
  await realpath(join(root, 'inside.txt')),
);
assert.equal(await resolveExistingSandboxPath(root, '.', true), await realpath(root));

await assert.rejects(
  () => resolveExistingSandboxPath(root, join(outside, 'secret.txt')),
  /outside.*workspace|sandbox/i,
);
await assert.rejects(
  () => resolveExistingSandboxPath(root, '../outside/secret.txt'),
  /outside.*workspace|sandbox/i,
);
await assert.rejects(
  () => resolveExistingSandboxPath(root, join(root, 'escape', 'secret.txt')),
  /outside.*workspace|symlink|sandbox/i,
);
await assert.rejects(
  () => resolveSandboxDestination(root, join(root, 'escape', 'created.txt')),
  /outside.*workspace|symlink|sandbox/i,
);

const destination = await resolveSandboxDestination(root, join(root, 'nested', 'created.txt'));
assert.equal(destination, join(await realpath(root), 'nested', 'created.txt'));

console.log('Filesystem sandbox tests passed');
