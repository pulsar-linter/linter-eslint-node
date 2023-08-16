'use babel';

import { readFile } from 'fs/promises';
import { homedir, platform } from 'os';
import { resolve, dirname } from 'path';

import { exists, findUp } from '../filesystem.js';

// https://docs.volta.sh/advanced/workspaces
async function getVoltaVersions(filePath) {
  let packageJsonPath = await findUp(
    filePath,
    'package.json'
  );

  if (typeof packageJsonPath !== 'string') {
    return;
  }

  try {
    // This is a dumb recursion blocker
    let maxPackageChecks = 3;

    while(maxPackageChecks--) {
      const { volta } = JSON.parse(await readFile(packageJsonPath));
      if (typeof volta?.node === 'string') {
        // { "volta": { "node": "12.16.1" } }
        return volta.node;
      }

      if (typeof volta?.extends === 'string') {
        // { "volta": { "extends": "../../package.json" } }
        packageJsonPath = resolve(
          dirname(packageJsonPath),
          volta.extends
        );
      }
    }

    // TODO: Think about logging max package json checks met
  } catch (error) {
    if (error.code === 'ENOTDIR') {
      // Parent directory of target file not found
      return;
    }

    if (error.code === 'ENOENT') {
      // TODO: File not found
      return;
    }

    const [ , callsite ] = error.stack.split(/\r?\n|\r/);
    if (
      error.name === 'SyntaxError' &&
      callsite.includes('JSON.parse')
    ) {
      // TODO: Think about logging invalid json
      return;
    }

    throw error;
  }
}

/**
 * @param {string} filePath
 * @param {import('../../types.js').Config} config
 * @returns {Promise<string>}
 */
export default async function (filePath, config) {
  const voltaHome = (
    config?.nodeLocation?.voltaHome ??
    process.env.VOLTA_HOME ??
    (
      platform() === 'win32'
        // %LOCALAPPDATA%\Volta on Windows
        ? resolve(homedir(), 'AppData', 'Local')
        // ~/.volta on Unix
        : resolve(homedir(), '.volta')
    )
  );

  if (await exists(voltaHome) === false) {
    return;
  }

  const version = await getVoltaVersions(filePath, voltaHome);

  if (version == null) {
    return;
  }

  return resolve(
    voltaHome,
    'tools', 'image', 'node',
    version,
    'bin', 'node'
  );
}
