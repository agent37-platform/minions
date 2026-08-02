import { copyFile, mkdir, readdir } from 'node:fs/promises';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceRoot = new URL('../server/', import.meta.url);
const destinationRoot = new URL('../dist/server/server/', import.meta.url);

async function copyAssets(directoryUrl) {
  const entries = await readdir(directoryUrl, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === '__pycache__') continue;
    const sourceUrl = new URL(`${entry.name}${entry.isDirectory() ? '/' : ''}`, directoryUrl);
    if (entry.isDirectory()) {
      await copyAssets(sourceUrl);
      continue;
    }
    if (!entry.name.endsWith('.sql') && !entry.name.endsWith('.py')) continue;

    const sourcePath = fileURLToPath(sourceUrl);
    const relativePath = relative(fileURLToPath(sourceRoot), sourcePath);
    const destinationPath = join(fileURLToPath(destinationRoot), relativePath);
    await mkdir(dirname(destinationPath), { recursive: true });
    await copyFile(sourcePath, destinationPath);
  }
}

await copyAssets(sourceRoot);
