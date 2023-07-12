'use babel';

import { readFile } from 'fs/promises';

import { findUp } from '../filesystem.js';

/**
 * @typedef {Object} PackageJson
 * @property {string} name The published package name
 * @property {string} description The published package description
 * @property {string} main The relative path to the main js file
 * @property {string} eslintVersion The published package version
 * @property {string} nodeVersion The allowed version of node
 */

/**
 * Get the path of the eslint package json
 * @param {string} eslintPath The path to the eslint api.js file
 * @returns {Promise<PackageJson>}
 */
export async function getESLintPackage(eslintPath) {
  const jsonPath = await findUp(eslintPath, 'package.json');

  if (jsonPath == null) {
    return null;
  }

  const buffer = await readFile(jsonPath);

  const parsed = JSON.parse(buffer);

  return {
    name: parsed.name,
    description: parsed.description,
    eslintVersion: parsed.version,
    main: parsed.main,
    nodeVersion: parsed.engines.node
  };
}
