const { get } = require('./get.js');
const SEVERITIES = ['info', 'warning', 'error'];

function getLocation (file, message) {
  if (message.fatal) {
    // Parsing errors don't define a range — only a single position. By
    // default, Linter will assume the other point in the range is [0, 0],
    // and report that the parsing error starts at Line 1, Column 1. That's
    // not helpful.
    //
    // Instead, we'll construct our own range that starts at the beginning
    // of the offending line, so that clicking on the message will take us
    // very close to the problem.
    const position = [
      [message.line - 1, 0],
      [message.line - 1, message.column - 1]
    ];

    return { file, position };
  }

  const position = [
    [message.line - 1, message.column - 1],
    [message.endLine - 1, message.endColumn - 1]
  ];

  return { file, position };
}

function convertResults (lintResults, rulesMeta, config, { isModified }) {
  const showRuleIdInMessage = get(config, 'advanced.showRuleIdInMessage', true);
  const ignoreFixableRulesWhileTyping = get(config, 'advanced.ignoreFixableRulesWhileTyping');
  const rulesToDisableWhileTyping = get(config, 'advanced.rulesToDisableWhileTyping', []);
  const output = [];

  for (const { filePath, messages } of lintResults) {
    for (const message of messages) {
      // Filter out any violations that the user has asked to ignore.
      if (isModified && ignoreFixableRulesWhileTyping && message.fix) {
        continue;
      }
      if (isModified && rulesToDisableWhileTyping.includes(message.ruleId)) {
        continue;
      }

      let idTag = '';
      if (showRuleIdInMessage) {
        idTag = message.fatal ? ' (Fatal)' : ` (${message.ruleId})`;
      }

      const rule = rulesMeta[message.ruleId];

      output.push({
        severity: SEVERITIES[message.severity] || 'error',
        location: getLocation(filePath, message),
        fix: message.fix,
        excerpt: `${message.message}${idTag}`,
        url: rule && rule.docs ? rule.docs.url : undefined
      });
    }
  }

  return output;
}

module.exports = { convertResults };
