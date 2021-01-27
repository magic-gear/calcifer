module.exports = (cli) => {
  cli.injectFeature({
    name: 'E2E Testing',
    value: 'e2e',
    short: 'E2E',
    description: 'Add an End-to-End testing solution to the app'
  })

  cli.injectPrompt({
    name: 'e2e',
    when: (answers) => answers.features.includes('e2e'),
    type: 'list',
    message: 'Pick an E2E testing solution:',
    choices: [
      {
        name: 'Cypress (Test in Chrome, Firefox, MS Edge, and Electron)',
        value: 'cypress',
        short: 'Cypress'
      }
    ]
  })
}
