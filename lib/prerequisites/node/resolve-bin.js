'use babel';

import { checkNodeBin } from './resolve-check-bin.js';

import loaderNvm from './loader-nvm.js';
import loaderVolta from './loader-volta.js';

const NODE_LOADERS = [
  loaderNvm, // https://github.com/nvm-sh/nvm
  loaderVolta // https://github.com/volta-cli/volta
  // TODO: // https://github.com/asdf-vm/asdf-nodejs
  // TODO: // https://github.com/tj/n
  // TODO: // https://github.com/ekalinin/nodeenv
  // TODO: // https://github.com/Schniz/fnm
  // TODO: // https://github.com/jasongin/nvs
];

/**
 * @param {string} filePath
 * @param {import('../../types.js').Config} config
 * @returns {Promise<string>}
 */
export async function resolveNodeBin(filePath, config) {
  if (config?.nodeLocation?.overrideNodeExecutable) {
    return checkNodeBin(config.nodeLocation.overrideNodeExecutable);
  }

  for (const loader of NODE_LOADERS) {
    const bin = await loader(filePath, config);

    if (typeof bin === 'string') {
      const resolved = await checkNodeBin(bin);
      if (typeof resolved === 'string') {
        return resolved;
      }

      throw Object.assign(
        new Error('Loader path provided, but binary not found'),
        { path: bin }
      );
    }
  }

  // Check for $(which node)
  return checkNodeBin('node');
}
