const Path = require('path');
const { readFileSync } = require('fs');
const { createRequire } = require('module');
const compareVersions = require('compare-versions');

const Messaging = require('./messaging.js');
const { IncompatibleVersionError } = require('./errors.js');
const { descendsFrom, findUp, findUpFromDirectory } = require('./fs-utils.js');

const BUILTIN_ESLINT_PATH = require.resolve('eslint');
const MINIMUM_ESLINT_VERSION = '8.0.0';

const CWD_CACHE = new Map();
const ESLINT_CACHE = new Map();

function findCwd (filePath, projectPath) {
  Messaging.log(`Looking for CWD for "${filePath}" in "${projectPath}"`);

  if (typeof filePath !== 'string') {
    return projectPath;
  }

  if (descendsFrom(filePath, projectPath) === false) {
    return Path.dirname(filePath);
  }

  const ignorePath = findUp(filePath, '.eslintignore', projectPath);
  if (typeof ignorePath === 'string') {
    return Path.dirname(ignorePath);
  }

  return projectPath;
}

function resolveESLint (filePath) {
  try {
    return createRequire(filePath).resolve('eslint');
  } catch (error) {
    if (error.code === 'MODULE_NOT_FOUND') {
      return BUILTIN_ESLINT_PATH;
    }

    throw error;
  }
}

function buildEslintOptions (cwd, config, shouldFix) {
  const ignore = !config.advanced.disableEslintIgnore;

  const fix = shouldFix
    // `fix` can be a function, so we'll use it to ignore any rules that the
    // user has told us to ignore. This isn't a "common" option, but it's easy
    // to overwrite with `fix: false` for the lint-only instance.
    ? ({ ruleId }) => !config
      .autofix
      .rulesToDisableWhileFixing
      .includes(ruleId)
    : false;

  Messaging.log({ cwd, ignore, fix, config });
  return { cwd, ignore, fix };
}

function loadESLint (resolveDir, filePath, config) {
  // If two files share a `cwd`, we can reuse any `ESLint` instance that was
  // created for one to lint the other. The `cwd` is almost always the project
  // root by convention.
  //
  // But `ESLint` only cares about `$cwd/.eslintignore`, not any others in
  // various folders. So the presence of `.eslintignore` in a folder is a
  // strong signal that someone intended to run `eslint` commands from that
  // folder.
  //
  // So we do this: starting at the file we're about to lint, we traverse
  // upwards until we hit either (a) an `.eslintignore` file, or (b) the
  // project root. This should handle most cases where project root isn't
  // package root; monorepos are the best example I can think of.
  //
  // (TODO: Monorepos, in fact, are the one thing that might thwart our choice
  // to stop looking when we hit the project root. If people complain about
  // this, consider making it a config flag.)
  //
  // We also have to think about the scenario where the file being linted
  // doesn't descend from the project root. Atom will, for instance, happily
  // open your init-file for editing in whatever project you're in at that
  // moment. For those files, we treat the directory they live in as the `cwd`.
  Messaging.log(`Creating new ESLint instance with cwd: ${resolveDir}`);

  const eslintPath = resolveESLint (filePath);
  const eslintPackageJson = findUpFromDirectory(
    eslintPath,
    'package.json',
  );

  Messaging.log(`Using ESLint instance: ${eslintPackageJson}, ${eslintPath}`);

  const packageMeta = JSON.parse(readFileSync(eslintPackageJson));
  const { ESLint } = createRequire(eslintPath)('eslint');
  let bundle = {
    cwd: resolveDir,
    isBuiltIn: eslintPath === BUILTIN_ESLINT_PATH,
    eslintPath: Path.dirname(eslintPackageJson),
    eslintVersion: packageMeta.version
  };

  // Older versions of ESLint won't have this API.
  if (ESLint) {
    const eslintLint = new ESLint(buildEslintOptions(resolveDir, config, false));
    const eslintFix = new ESLint(buildEslintOptions(resolveDir, config, true));

    Object.assign(bundle, { ESLint, eslintLint, eslintFix });

    return bundle;
  }
}

function checkVersions (eslintVersion, { isDebug }) {
    if (isDebug) {
      return;
    }

    if (compareVersions(eslintVersion, MINIMUM_ESLINT_VERSION) < 1) {
      // Unsupported version.
      throw new IncompatibleVersionError(eslintVersion, MINIMUM_ESLINT_VERSION);
    }

}

function getESLint (filePath, config, options) {
  let { advanced: { useCache } } = config;

  if (
    useCache === false ||
    CWD_CACHE.has(filePath) === false
  ) {
    CWD_CACHE.set(filePath, findCwd(filePath, options.projectPath));
  }
  const resolveDir = CWD_CACHE.get(filePath);
  Messaging.log(`CWD set as: "${resolveDir}"`);

  if (useCache === false) {
    const bundle = loadESLint(resolveDir, filePath, config);

    checkVersions(bundle.eslintVersion, options);

    return bundle;
  }

  if (ESLINT_CACHE.has(resolveDir) === false) {
    ESLINT_CACHE.set(resolveDir, loadESLint(resolveDir, filePath, config));
  }

  const bundle = ESLINT_CACHE.get(resolveDir);
  checkVersions(bundle.eslintVersion, options);

  return bundle;
}

function clearESLintCache () {
  CWD_CACHE.clear();
  ESLINT_CACHE.clear();
}

module.exports = {
  BUILTIN_ESLINT_PATH,
  MINIMUM_ESLINT_VERSION,
  getESLint,
  clearESLintCache
};
