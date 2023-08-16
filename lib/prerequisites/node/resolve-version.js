'use babel';

import child_process from 'child_process';
import { promisify } from 'util';

import moize from 'moize';

const exec = promisify(child_process.exec);

/**
 * Get the node version from a nodejs binary path
 * @param {string} executable The path to the nodejs executable
 * @returns {Promise<string>} The version from the node executable
 */
async function _resolveNodeVersion(executable) {
  if (typeof executable !== 'string') {
    return null;
  }

  const { stdout } = await exec(`${executable} --version`);
  // Remove the trailing space
  const version = stdout.trim();

  if (version.length === 0) {
    return null;
  }

  // Remove the 'v' prefix
  return version.slice(1);
}

export const resolveNodeVersion = moize(
  _resolveNodeVersion,
  { isPromise: true }
);
