module.exports = (cli) => {
  cli.injectFeature({
    name: 'UI Library',
    value: 'ui',
    description: 'Add UI library'
  })
  cli.injectPrompt({
    name: 'uiLib',
    when: (answers) => answers.features.includes('ui'),
    type: 'list',
    message: 'Pick a UI library:',
    choices: [
      {
        name: 'antd',
        value: 'antd'
      }
    ]
  })
}
