const { jobLint, clearLintCache } = require('./job-lint.js');
const { jobFix, clearFixCache } = require('./job-fix.js');
const { processMessage } = require('../common/process-message.js');

process.on('message', processMessage({
  lint: jobLint,
  fix: jobFix,
  'clear-cache': () => {
    clearLintCache();
    clearFixCache();
  }
}));
