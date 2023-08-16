/**
 * @typedef {'clear-cache' | 'lint' | 'fix'} JobType
 */

/**
 * @typedef {Object} JobContent
 * @property {string} filePath The path to the file to lint
 * @property {string} projectPath The path to the project root
 * @property {boolean} isModified Is the contents different to the saved file
 * @property {string} contents The current contents of the file
 */

/**
 * @typedef {Object} Job
 * @property {string} key
 * @property {JobType} type
 * @property {JobContent} content
 * @property {import('../../types.js').Config} config
 * @property {import('../../prerequisites/index.js').PrerequisiteInfo} prerequisite
 */

module.exports = {};
