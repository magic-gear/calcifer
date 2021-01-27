module.exports = (cli) => {
  cli.injectFeature({
    name: 'CSS In JS',
    value: 'css-in-js',
    description: 'Add support for writing css in JavaScript'
  })

  cli.injectPrompt({
    name: 'cssInJs',
    when: (answers) => answers.features.includes('css-in-js'),
    type: 'list',
    message: `Pick a CSS In JS solution:`,
    choices: [
      {
        name: 'Emotion',
        value: 'emotion'
      }
    ]
  })
}
