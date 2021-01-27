module.exports = (cli) => {
  cli.injectFeature({
    name: 'Router',
    value: 'router'
  })

  cli.injectPrompt({
    name: 'router',
    when: (answers) => answers.features.includes('router'),
    type: 'list',
    message: 'Pick a router library:',
    choices: [
      {
        name: 'react-router-dom',
        value: 'react-router-dom'
      }
    ]
  })
}
