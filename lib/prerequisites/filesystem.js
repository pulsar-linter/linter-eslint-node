'use babel';

import * as Path from 'path';
import { stat } from 'fs/promises';

export async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Does {filePath} exist in {projectPath}
 * @param {string} [filePath] The path of the file to check
 * @param {string} [projectPath] The path of the project
 * @returns {boolean}
 */
export function descendsFrom (filePath, projectPath) {
  if (
    typeof filePath !== 'string' ||
    typeof projectPath !== 'string'
  ) {
    return false;
  }

  return !Path
    .relative(projectPath, filePath)
    .startsWith('..');
}

/**
 * Create a list of parent directories from {filepath} to {stopDirectory}
 * @param {string} filepath The file to start from
 * @param {string} [stopDirectory] The directory to stop at
 * @returns {string[]}
 */
export function listParents(filepath, stopDirectory = '/') {
  // The file is not from within the stopDirectory
  if (descendsFrom(filepath, stopDirectory) === false) {
    return [];
  }

  const output = [];
  const end = Path.resolve(stopDirectory);
  do {
    filepath = Path.dirname(filepath);
    output.push(filepath);
  } while (end !== filepath);

  return output;
}

/**
 * Find the closest {filename} starting from {rootFilePath}
 * @param {string} rootFilePath The file to start the search from
 * @param {string} filename The filename to find
 * @param {string} [stopDirectory] The directory to stop searching at
 * @returns {Promise<string|null>} Returns absolute path to the closest {filename} if found
 */
export async function findUp (rootFilePath, filename, stopDirectory = Path.resolve('/')) {
  for (const directory of listParents(rootFilePath, stopDirectory)) {
    const target = Path.join(directory, filename);

    if (await exists(target)) {
      return target;
    }
  }

  return null;
}
