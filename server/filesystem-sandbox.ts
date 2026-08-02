import { lstat, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { errorCode } from './errors.js';

export class SandboxPathError extends Error {
  readonly status = 403;
  readonly code = 'PATH_OUTSIDE_WORKSPACE';

  constructor(message = 'Path is outside the workspace sandbox') {
    super(message);
    this.name = 'SandboxPathError';
  }
}

function isSameOrChildPath(parentPath: string, childPath: string): boolean {
  const childRelativePath = relative(parentPath, childPath);
  return childRelativePath === ''
    || (!childRelativePath.startsWith('..') && !isAbsolute(childRelativePath));
}

function candidatePath(rootPath: string, value: string, fallbackToRoot: boolean): string {
  const trimmed = value.trim();
  if (!trimmed || (fallbackToRoot && trimmed === '.')) return rootPath;
  if (trimmed.includes('\0')) throw new SandboxPathError('Path contains an invalid character');
  return isAbsolute(trimmed) ? resolve(trimmed) : resolve(rootPath, trimmed);
}

async function sandboxRoot(rootPath: string): Promise<string> {
  try {
    return await realpath(resolve(rootPath));
  } catch {
    throw new SandboxPathError('Workspace sandbox is unavailable');
  }
}

export async function resolveExistingSandboxPath(
  rootPath: string,
  value: string,
  fallbackToRoot = false,
): Promise<string> {
  const root = await sandboxRoot(rootPath);
  const candidate = candidatePath(root, value, fallbackToRoot);
  if (!isSameOrChildPath(root, candidate)) throw new SandboxPathError();

  const resolved = await realpath(candidate);
  if (!isSameOrChildPath(root, resolved)) {
    throw new SandboxPathError('Path resolves outside the workspace sandbox');
  }
  return resolved;
}

export async function resolveSandboxDestination(rootPath: string, value: string): Promise<string> {
  const root = await sandboxRoot(rootPath);
  const candidate = candidatePath(root, value, false);
  if (!isSameOrChildPath(root, candidate)) throw new SandboxPathError();

  let ancestor = candidate;
  while (true) {
    try {
      await lstat(ancestor);
      break;
    } catch (error) {
      if (errorCode(error) !== 'ENOENT') throw error;
      const parent = resolve(ancestor, '..');
      if (parent === ancestor) throw new SandboxPathError();
      ancestor = parent;
    }
  }

  const resolvedAncestor = await realpath(ancestor);
  if (!isSameOrChildPath(root, resolvedAncestor)) {
    throw new SandboxPathError('Path traverses a symlink outside the workspace sandbox');
  }

  const suffix = relative(ancestor, candidate);
  const destination = resolve(resolvedAncestor, suffix);
  if (!isSameOrChildPath(root, destination)) throw new SandboxPathError();
  return destination;
}
