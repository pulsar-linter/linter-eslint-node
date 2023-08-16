'use babel';

/**
 * @typedef {Object} ConfigESLintLocation
 * @property {string} [overrideESLintClient] Force the use of a specific eslint api.
 *    This can be:
 *    - An absolute path
 *    - 'global'
 *    - 'bundled'
 * @property {string} [overrideESLintConfig] Allows you to specify a configuration file for ESLint
 * @property {string} [resolvePluginsRelativeTo] Changes the directory where plugins are resolved from
 * @property {boolean} [allowGlobal=false] Allow using a globally installed eslint (via npm)
 * @property {boolean} [allowBundled=false] Allow using the eslint version that comes with linter-eslint-node
 */

/**
 * @typedef {Object} ConfigNodeLocation
 * @property {string} [overrideNodeExecutable] A path to a NodeExecutable to force the use of
 * @property {string} [nvmDir] The NVM base directory
 * @property {string} [voltaHome] The Volta shim directory
 */

/**
 * @typedef {Object} ConfigAdvanced
 * @property {string[]} [rulesToDisableWhileFixing=[]]
 * @property {string[]} [rulesToDisableWhileTyping=[]]
 * @property {boolean} [ignoreFixableRulesWhileTyping=false]
 * @property {boolean} [disableEslintIgnore=false]
 * @property {boolean} [showRuleIdInMessage=true]
 * @property {boolean} [enableLogging=false]
 */

/**
 * @typedef {Object} Config
 * @property {ConfigESLintLocation} [eslintLocation]
 * @property {ConfigNodeLocation} [nodeLocation]
 * @property {string[]} [scopes]
 * @property {boolean} [fixOnSave=false]
 * @property {ConfigAdvanced} [advanced]
 */

/**
  * @typedef {Object} LintSolution
  * @property {string} title
  * @property {import('atom').Range} position
  * @property {number} [priority]
  * @property {string} [currentText]
  * @property {string} replaceWith
  */

/**
  * @typedef {Object} LintMessage
  * @property {{
  *   file: string,
  *   position: import('atom').RangeCompatible,
  * }} location Location of the issue (aka where to highlight)
  * @property {string} [url] HTTP link to a resource explaining the issue. Default is a google search
  * @property {string} [linterName] Optionally override the displayed linter name
  * @property {string} [icon] Name of octicon to show in gutter
  * @property {string} excerpt Error message
  * @property {(
  *   string |
  *   () => Promise<string> |
  *   () => string
  * )} description Markdown long description of the error (accepts callback)
  * @property {'error' | 'warning' | 'info'} severity Severity of error
  * @property {LintSolution[]} [solutions] Possible solutions to the error
  */

// this is a hack to allow the jsdoc defs to be exported
export default {};
