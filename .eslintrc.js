module.exports = {
  env: {
    browser: true,
    es6: true,
    node: true
  },
  extends: ['eslint:recommended', 'plugin:prettier/recommended'],
  parser: 'babel-eslint',
  rules: {
    indent: ['error', 2],
    'linebreak-style': [0, 'error', 'windows'],
    quotes: ['error', 'single'],
    'no-console': 'off',
    'no-var-requires': 'off',
    'eslint-disable-next-line': 'off'
  }
}
