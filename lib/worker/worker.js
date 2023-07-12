// This is a script meant to run in an arbitrary Node environment. It does not
// run within an Atom context and should not `require` anything except (a)
// ESLint itself, (b) built-in Node modules, and (c) pure NPM modules with
// broad cross-Node compatibility.

const compareVersions = require('compare-versions');
const ndjson = require('ndjson');
const Messaging = require('./messaging.js');
const {
  JobKeyError,
  JobTypeError,
  JobNotFoundError,
  ConfigNotFoundError,
  UnknownError,
} = require('./errors.js');
const {
  MINIMUM_ESLINT_VERSION,
  getESLint,
  clearESLintCache
} = require('./eslint.js');
const { convertResults } = require('./convert-results.js');

/**
 * @param {import('eslint').ESLint} eslint
 * @param {string} [filePath]
 * @param {string} [fileContent]
 * @returns {Promise<import('eslint').ESLint.LintResult[]>}
 */
async function lintPathOrContent (eslint, filePath, fileContent) {
  if (typeof fileContent === 'string') {
    return eslint.lintText(fileContent, { filePath });
  } else {
    return eslint.lintFiles([filePath]);
  }
}

function jobClearCache() {
  clearESLintCache();
  return { result: true };
}

function jobDebug ({ projectPath, filePath, config }) {
  const isDebug = true;

  const eslint = getESLint(
    filePath,
    config,
    { isDebug, projectPath }
  );

  const comparison = compareVersions(
    eslint.eslintVersion,
    MINIMUM_ESLINT_VERSION
  );

  return {
    eslintPath: eslint.eslintPath,
    eslintCwd: eslint.cwd,
    eslintVersion: eslint.eslintVersion,
    isBuiltIn: eslint.isBuiltIn,
    isIncompatible: comparison < 1,
    workerPid: process.pid
  };
}

async function lintFile (meta, filePath, fileContent) {
  const { eslintLint } = meta;
  return lintPathOrContent(eslintLint, filePath, fileContent);
}

async function jobESLintLint ({
  projectPath, config, filePath, isModified, contents
}) {
  const eslint = getESLint(filePath, config, { projectPath });
  process.chdir(eslint.cwd);

  const lintResults = await lintFile(eslint, filePath, contents);
  const rulesMeta = eslint.eslintLint.getRulesMetaForResults(lintResults);

  return {
    rules: rulesMeta,
    results: convertResults(
      lintResults,
      rulesMeta,
      config,
      { isModified }
    ),
  };
}

async function fixFile (meta, filePath, fileContent) {
  const { ESLint, eslintFix } = meta;
  const results = await lintPathOrContent(eslintFix, filePath, fileContent);
  await ESLint.outputFixes(results);
  return results;
}

function countMessages (results) {
  let count = 0;
  for (let { messages } of results) {
    count += messages.length;
  }
  return count;
}

async function jobESLintFix ({
  projectPath, config, filePath, isModified, contents
}) {
  const eslint = getESLint(filePath, config, { projectPath });
  process.chdir(eslint.cwd);

  const lintResults = await lintFile(eslint, filePath, contents);
  const lintMessageCount = countMessages(lintResults);

  const fixResults = await fixFile(eslint, filePath, contents);
  const rulesMeta = eslint.eslintFix.getRulesMetaForResults(fixResults);

  const result = {
    rules: rulesMeta,
    results: convertResults(
      fixResults,
      rulesMeta,
      config,
      { isModified }
    ),
  };

  if (lintMessageCount > 0) {
    result.fixCount = lintMessageCount - result.results.length;
  }

  return result;
}

async function processMessage (bundle) {
  const oldCwd = process.cwd();

  try {
    const { type } = bundle;
    if (type == null) {
      throw new JobTypeError();
    }

    switch (type) {
      case 'clear-cache': return jobClearCache(bundle);
      case 'debug': return jobDebug(bundle);
      case 'lint': return jobESLintLint(bundle);
      case 'fix': return jobESLintFix(bundle);
      default: throw new JobNotFoundError(type);
    }
  } finally {
    process.chdir(oldCwd);
  }
}

function handleError(error, { key, filePath, projectPath } = {}) {
  if (error.messageTemplate === 'no-config-found') {
    error = new ConfigNotFoundError(error.message, filePath, projectPath);
  }

  if (error instanceof Error) {
    error.error = error.message;
    error.key = key;

    return error;
  }

  return new UnknownError();
}

if (require.main === module) {
  process.stdin
  .pipe(ndjson.parse({ strict: false }))
  .on('data', (data) => {
    Messaging.runWith(data, async () => {
      try {
        if (!data.key) {
          throw new JobKeyError();
        }

        Messaging.emitMessage(await processMessage(data));
      } catch (error) {
        Messaging.emitError(handleError(error, data));
      }
    });
  });

  process.stdin.resume();

  process.on('uncaughtException', (error) => {
    error.uncaught = true;
    error.error = 'Unknown error';

    // We're catching this exception so that we can try to emit it as JSON
    // before exiting. That way `JobManager` can at least attempt to report
    // something meaningful to the user. But emitting the error as JSON might
    // _itself_ fail, so we've got to guard against that, lest we start an
    // infinite loop.
    try {
      Messaging.emitError(error);
    } finally {
      // eslint-disable-next-line n/no-process-exit
      process.exit(1);
    }
  });

  process.title = `node (linter-eslint-node worker ${process.pid})`;

  // Signal to the package that we're ready to lint.
  Messaging.emit({ type: 'ready' });
}
