module.exports = (cli) => {
  cli.injectFeature({
    name: 'Linter / Formatter',
    value: 'linter',
    short: 'Linter',
    description: 'Check and enforce code quality with ESLint or Prettier',
    plugins: ['eslint'],
    checked: true
  })

  cli.injectPrompt({
    name: 'eslintConfig',
    when: (answers) => answers.features.includes('linter'),
    type: 'list',
    message: 'Pick a linter / formatter config:',
    choices: () => [
      {
        name: 'ESLint + Prettier',
        value: 'prettier',
        short: 'Prettier'
      }
    ]
  })
}
