'use babel';

import { resolveNodeBin } from './node/resolve-bin.js';
import { resolveNodeVersion } from './node/resolve-version.js';

/**
 * @typedef {Object} NodeInfo
 * @property {string} [executable]  The path to the nodejs executable file
 * @property {string} [version]  The version of the nodejs executable file
 */

/**
 * @param {string} filePath
 * @param {import('../types.js').Config} config
 * @returns {Promise<NodeInfo>}
 */
export async function getNodeInfo(filePath, config) {
  const executable = await resolveNodeBin(filePath, config);
  const version = await resolveNodeVersion(executable);

  return { executable, version };
}
