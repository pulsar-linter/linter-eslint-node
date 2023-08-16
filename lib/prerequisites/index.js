'use babel';

import { satisfies } from 'compare-versions';

import { getESLintInfo } from './eslint.js';
import { getNodeInfo } from './node.js';

import { resolveNodeVersion } from './node/resolve-version.js';
import { checkNodeBin } from './node/resolve-check-bin.js';

/**
 * @typedef {Object} PrerequisiteInfo
 * @property {string} [nodePath] The Path to a valid node binary
 * @property {string} [nodeVersion] The version of the node binary (extracted from the binary)
 * @property {string} [eslintPath] The path to the resolved eslint api file
 * @property {string} [eslintVersion] The eslint version resolved from the package.json closest to the eslint api path
 * @property {string} [eslintConfig] The path to the eslint config file
 * @property {string} [eslintIgnore] The path to the eslint ignore file (if found)
 * @property {string} [workingDirectory] The best working directory for the given file
 * @property {boolean} nodeSatisfies Whether the {nodeVersion} is acceptable for {eslintVersion}
 */

/**
 * Get all info required for linter-eslint-node
 * @param {string} filePath
 * @param {string} projectPath
 * @param {import('../types.js').Config} config∑
 * @returns {Promise<PrerequisiteInfo>}
 */
export async function getFileInfo(filePath, projectPath, config) {
  const node = await getNodeInfo(filePath, config);
  const eslint = await getESLintInfo(filePath, config);

  return {
    nodePath: node.executable,
    nodeVersion: node.version,
    eslintPath: eslint.eslintPath,
    eslintVersion: eslint.eslintVersion,
    eslintConfig: eslint.eslintConfig,
    eslintIgnore: eslint.eslintIgnore,
    workingDirectory: eslint.workingDirectory ?? projectPath,
    nodeSatisfies: (
      // Can only get nodeVersion if nodePath works
      typeof node.version === 'string' &&
      typeof eslint.nodeVersion === 'string' &&
      satisfies(node.version, eslint.nodeVersion)
    )
  };
}

export function clearCache() {
  resolveNodeVersion.clear();
  checkNodeBin.clear();
}
