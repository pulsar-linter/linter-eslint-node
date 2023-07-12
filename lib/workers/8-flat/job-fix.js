const { createRequire } = require('module');

const { get } = require('../common/get.js');
const console = require('../common/console.js');
const { convertResults } = require('../common/convert-results.js');

/**
 * @type {Map<string, import('eslint').ESLint>}
 */
const cache = new Map();

/**
 * @param {import('../common/types.js').Job} job
 */
async function jobFix({ content, prerequisite, config }) {
  const cacheKey = `${prerequisite.workingDirectory}:${prerequisite.eslintPath}`;

  console.debug('Fixing using v8 FlatESLint', content.filePath, {
    workingDirectory: prerequisite.workingDirectory,
    eslintPath: prerequisite.eslintPath
  });

  if (cache.has(cacheKey) === false) {
    console.debug('Loading v8 FlatESLint', prerequisite.workingDirectory, prerequisite.eslintPath);

    // We need to redirect the api call to "eslint/use-at-your-own-risk"
    const lRequire = createRequire(prerequisite.eslintPath);

    /** @type {{ FlatESLint: import('eslint').ESLint }} */
    const { FlatESLint } = lRequire('eslint/use-at-your-own-risk');

    const rulesToDisableWhileFixing = get(config, 'advanced.rulesToDisableWhileFixing', []);
    cache.set(cacheKey, new FlatESLint({
      cwd: prerequisite.workingDirectory,
      globInputPaths: false,
      fix: ({ ruleId }) => !rulesToDisableWhileFixing.includes(ruleId),
      ignore: !get(config, 'advanced.disableEslintIgnore', false),
      overrideConfigFile: get(config, 'eslintLocation.overrideESLintConfig')
    }));
  }

  const eslint = cache.get(cacheKey);

  if (await eslint.isPathIgnored(content.filePath)) {
    console.debug('Skipping ignored file:', content.filePath);
    return {};
  }

  const lintResults = await eslint.lintText(
    content.fileText,
    { filePath: content.filePath }
  );
  const rulesMeta = eslint.getRulesMetaForResults(lintResults);

  await eslint.constructor.outputFixes(lintResults);

  return {
    rules: rulesMeta,
    fixApplied: typeof lintResults[0].output === 'string',
    results: convertResults(lintResults, rulesMeta, config, content)
  };
}

module.exports = {
  jobFix: jobFix,
  clearFixCache: () => cache.clear()
};
