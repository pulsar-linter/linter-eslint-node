const globals = require('globals')

module.exports = [
  {
    languageOptions: {
      globals: {
        ...globals.node
      }
    },
    rules: {
      "indent": ["error", 2],
      "no-undef": "error",
      "no-console": "off",
      "semi": [
        "error",
        "never"
      ],
    }
  }
]
