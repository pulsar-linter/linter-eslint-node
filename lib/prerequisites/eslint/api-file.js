'use babel';

import child_process from 'child_process';
import { createRequire } from 'module';
import { isAbsolute } from 'path';
import { promisify } from 'util';

const exec = promisify(child_process.exec);

async function findGlobalESLint() {
  try {
    // TODO: think about handling node versioning
    const { stdout } = await exec(
      'npm root -g',
      { encoding: 'utf-8' }
    );

    return createRequire(stdout.trim()).resolve('eslint');
  } catch {
    return null;
  }
}

function findBundledESLint() {
  try {
    return require.resolve('eslint');
  } catch {
    return null;
  }
}

function findFileESLint(filePath) {
  try {
    return createRequire(filePath).resolve('eslint');
  } catch {
    return null;
  }
}

/**
 * @param {import('../../types.js').Config} config
 * @returns {Promise<string>}
 */
async function getForcedPath(path) {
  if (typeof path !== 'string') {
    return;
  }

  if (path === 'global') {
    return await findGlobalESLint();
  }

  if (path === 'bundled') {
    return findBundledESLint();
  }

  if (isAbsolute(path)) {
    return path;
  }

  throw new Error(`"${path}" eslint not found`);
}

/**
 * Get the path of the eslint executable file
 * @param {string} filePath
 * @param {import('../../types.js').Config} config
 * @returns {Promise<string>}
 */
export async function getESLintFile(filePath, config) {
  const overrideESLintClient = getForcedPath(
    config?.eslintLocation?.overrideESLintClient
  );

  if (typeof overrideESLintClient === 'string') {
    return overrideESLintClient;
  }

  const localPath = findFileESLint(filePath);
  if (typeof localPath === 'string') {
    return localPath;
  }

  // Only works with npm
  // Does not work with yarn or pnpm
  if (config?.eslintLocation?.allowGlobal === true) {
    const globalPath = await findGlobalESLint();
    if (typeof globalPath === 'string') {
      return globalPath;
    }
  }

  if (config?.eslintLocation?.allowBundled === true) {
    const bundledPath = findBundledESLint();
    if (typeof bundledPath === 'string') {
      return bundledPath;
    }
  }

  return null;
}
