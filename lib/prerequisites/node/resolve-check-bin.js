'use babel';

import { resolve, isAbsolute } from 'path';
import which from 'which';
import moize from 'moize';

import { exists } from '../filesystem.js';

/**
 * Check that the executable path exists and is resolvable
 * @param {string} executable The exact path to the binary, or the name of a file found in $PATH
 * @returns {Promise<string|null>} The resolved file path
 */
async function _checkNodeBin(executable) {
  if (isAbsolute(executable)) {
    if (await exists(executable)) {
      return resolve(executable);
    }

    return null;
  }

  try {
    return await which(executable);
  } catch (error) {
    return null;
  }
}

export const checkNodeBin = moize(
  _checkNodeBin,
  { isPromise: true }
);
