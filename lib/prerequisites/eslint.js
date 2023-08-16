'use babel';

import { dirname } from 'path';
import { getESLintFile } from './eslint/api-file.js';
import { getESLintPackage } from './eslint/package.js';
import { getESLintConfig, getESLintIgnore } from './eslint/config.js';

/**
 * @typedef {Object} ESLintInfo
 * @property {string} [path] The path to the eslint api.js file
 * @property {string} [eslintVersion] The published package version
 * @property {string} [nodeVersion] The allowed version of node
 * @property {string} [eslintConfig] The closest eslint config file
 * @property {string} [eslintIgnore] The closest .eslintignore file
 * @property {string} [workingDirectory] The expected cwd for the given eslint file
 */

/**
 * Get all info required for eslint
 * @param {string} filePath
 * @param {import('../types.js').Config} config
 * @returns {Promise<ESLintInfo>}
 */
export async function getESLintInfo(filePath, config) {
  const path = await getESLintFile(filePath, config);
  if (typeof path !== 'string') {
    return {};
  }

  const packageJson = await getESLintPackage(path);
  const eslintConfig = await getESLintConfig(filePath, packageJson?.eslintVersion, config);
  const eslintIgnore = await getESLintIgnore(filePath);

  return {
    eslintPath: path,
    eslintVersion: packageJson?.eslintVersion,
    nodeVersion: packageJson?.nodeVersion,

    eslintConfig: eslintConfig,
    eslintIgnore: eslintIgnore,
    workingDirectory: eslintIgnore
      ? (eslintIgnore ? dirname(eslintIgnore) : null)
      : (eslintConfig ? dirname(eslintConfig) : null)
  };
}
