import globals from "globals";
import pluginJs from "@eslint/js";

export default [
  {
    ignores: ["ignored.js"]
  },
  {languageOptions: { globals: globals.browser }},
  pluginJs.configs.recommended,
  {
    rules: {
      'no-unused-vars': 'warn'
    }
  }
];
