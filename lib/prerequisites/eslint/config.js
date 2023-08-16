'use babel';

import { resolve } from 'path';
import { readdir, readFile } from 'fs/promises';

import { listParents, findUp } from '../filesystem.js';

const CONFIG_FILE_ORDER = [
  '.eslintrc',
  '.eslintrc.js',
  '.eslintrc.cjs',
  '.eslintrc.yaml',
  '.eslintrc.yml',
  '.eslintrc.json',
  'package.json'
];

async function isESLintPackageJson() {
  return false;
}

/**
 * @param {string} filePath
 * @returns {Promise<string|null>}
 */
async function getV8Config(filePath) {
  let highestDirectory = null;
  for (const directory of listParents(filePath)) {
    const ls = (await readdir(directory, { withFileTypes: true }))
      .filter(file => file.isFile())
      .map(file => file.name);

    const config = CONFIG_FILE_ORDER
      .find(file => ls.includes(file));

    if (config == null) {
      continue;
    }

    const path = resolve(directory, config);

    if (
      config === 'package.json' &&
      (await isESLintPackageJson(path)) !== true
    ) {
      continue;
    }

    /*
     * Hacky "root: true" check
     */
    const content = await readFile(path, { encoding: 'utf8', flag: 'r'});

    // Does not work when "root: true" is commented...
    // Probably need to parse the file correctly :(
    if (/(['"`]?)root\1:\s*true/.test(content)) {
      return path;
    }

    highestDirectory = path;
  }

  return highestDirectory;
}

/**
 * @param {string} filePath
 * @returns {Promise<string|null>}
 */
async function getV9Config(filePath) {
  // Search up for eslint.config.js
  return await findUp(filePath, 'eslint.config.js');
}

/**
 * Get the best cwd for the linted file
 * @param {string} filePath
 * @param {string} eslintVersion
 * @param {import('../../types.js').Config} config
 * @returns {Promise<string|null>}
 */
export async function getESLintConfig(filePath, eslintVersion, config) {
  if (typeof eslintVersion !== 'string') {
    return null;
  }

  if (config?.eslintLocation?.overrideESLintConfig) {
    return config.eslintLocation.overrideESLintConfig;
  }

  const [ major ] = eslintVersion.split('.');

  switch (major) {
    case '8': return await getV8Config(filePath) ?? await getV9Config(filePath);
    case '9': return getV9Config(filePath);
  }

  return null;
}

/**
 * @param {string} filePath
 * @returns {Promise<string|null>}
 */
export async function getESLintIgnore(filePath) {
  // Search up for eslint.config.js
  return await findUp(filePath, '.eslintignore');
}
