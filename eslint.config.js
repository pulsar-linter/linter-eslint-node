const globals = require("globals");
const pluginJs = require("@eslint/js");
const importPlugin = require("eslint-plugin-import-x");

module.exports = [
  {
    ignores: ["spec/fixtures/**/*.js"]
  },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.node,
        atom: 'readonly'
      },
    }
  },
  pluginJs.configs.recommended,
  {
    plugins: {
      importPlugin,
    },
    rules: {
      'no-unused-vars': ['warn', {
        varsIgnorePattern: '^_',
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_'
      }]
    }
  },
  {
    files: ['spec/runner.js', 'spec/*-spec.js'],
    languageOptions: {
      globals: {
        ...globals.jasmine,
        pass: 'readonly'
      }
    }
  }
];
