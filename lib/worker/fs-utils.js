const Path = require('path');
const { existsSync } = require('fs');

/**
 * Does {filePath} exist in {projectPath}
 * @param {string} [filePath] The path of the file to check
 * @param {string} [projectPath] The path of the project
 * @returns {boolean}
 */
function descendsFrom (filePath, projectPath) {
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
 * Find the closest {filename} starting from {rootFilePath}
 * @param {string} rootFilePath The file to start the search from
 * @param {string} filename The filename to find
 * @param {string} [stopDirectory] The directory to stop searching at
 * @returns {string|null} Returns absolute path to the closest {filename} if found
 */
function findUp (rootFilePath, filename, stopDirectory = Path.resolve('/')) {
  // The file is not from within the stopDirectory
  if (descendsFrom(rootFilePath, stopDirectory) === false) {
    return null;
  }

  let file = rootFilePath;

  while (file !== Path.dirname(file)) {
    file = Path.dirname(file);
    const target = Path.join(file, filename);

    if (existsSync(target)) {
      return target;
    }

    if (stopDirectory === file) {
      break;
    }
  }

  return null;
}

/**
 * Find the closest {filename} starting from {rootDirectory}
 * @param {string} rootDirectory The directory to start the search from
 * @param {string} filename The filename to find
 * @param {string} [stopDirectory] The directory to stop searching at
 * @returns {string|null} Returns absolute path to the closest {filename} if found
 */
function findUpFromDirectory (rootDirectory, filename, stopDirectory) {
  const firstFile = Path.join(rootDirectory, filename);

  return findUp(firstFile, filename, stopDirectory);
}

module.exports = { descendsFrom, findUp, findUpFromDirectory };
