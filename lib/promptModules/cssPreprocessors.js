module.exports = (cli) => {
  cli.injectFeature({
    name: 'CSS Pre-processors',
    value: 'css-preprocessor',
    description: 'Add support for CSS pre-processors like Sass, Less or Stylus'
  })

  const notice = 'PostCSS, Autoprefixer and CSS Modules are supported by default'

  cli.injectPrompt({
    name: 'cssPreprocessor',
    when: (answers) => answers.features.includes('css-preprocessor'),
    type: 'list',
    message: `Pick a CSS pre-processor (${notice})}`,
    description: `${notice}.`,
    choices: [
      {
        name: 'Less',
        value: 'less'
      }
    ]
  })
}
