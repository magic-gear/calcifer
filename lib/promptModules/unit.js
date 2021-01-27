module.exports = (cli) => {
  cli.injectFeature({
    name: 'Unit Testing',
    value: 'unit',
    short: 'Unit',
    description: 'Add a Unit Testing solution like Jest or Mocha',
    plugins: ['unit-jest', 'unit-mocha']
  })

  cli.injectPrompt({
    name: 'unit',
    when: (answers) => answers.features.includes('unit'),
    type: 'list',
    message: 'Pick a unit testing solution:',
    choices: [
      {
        name: 'Jest',
        value: 'jest',
        short: 'Jest'
      }
    ]
  })
}
