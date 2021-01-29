module.exports = {
  env: {
    commonjs: true,
    es2021: true,
    node: true
  },
  extends: ['eslint:recommended', 'prettier'],
  parserOptions: {
    ecmaVersion: 12
  },
  parser: 'babel-eslint',
  rules: {
    'no-unused-vars': ['error', { varsIgnorePattern: '^_' }],
    'no-empty': ['error', { allowEmptyCatch: true }]
  }
}
