module.exports = {
  root: true,
  plugins: [ 'import' ],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module"
  },
  rules: {
    'import/newline-after-import': 'error'
  }
}
