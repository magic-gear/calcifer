const chalk = require('chalk')
const fs = require('fs-extra')
const path = require('path')
const inquirer = require('inquirer')

const validateProjectName = require('validate-npm-package-name')
const Creator = require('./Creator')
const { clearConsole } = require('./utils/logger')

async function create(name, options) {
  const root = path.resolve(name)
  checkAppName(name)
  if (fs.existsSync(root)) {
    if (options.force) {
      await fs.remove(root)
    } else {
      await clearConsole()
      const { action } = await inquirer.prompt([
        {
          name: 'action',
          type: 'list',
          message: `Target directory ${chalk.cyan(root)} already exists. Pick an action:`,
          choices: [
            { name: 'Overwrite', value: 'overwrite' },
            { name: 'Merge', value: 'merge' },
            { name: 'Cancel', value: false }
          ]
        }
      ])
      if (!action) {
        return
      } else if (action === 'overwrite') {
        console.log(`\nRemoving ${chalk.cyan(root)}...`)
        await fs.remove(root)
      }
    }
  }
  const creator = new Creator(name, root, getPromptModules())
  await creator.create(options)
}

function getPromptModules() {
  return [
    'typescript',
    'router',
    'uiLibrary',
    'cssPreprocessors',
    'cssInJs',
    'linter',
    'unit',
    'e2e'
  ].map((file) => require(`./promptModules/${file}`))
}

function checkAppName(name) {
  const result = validateProjectName(name)
  if (!result.validForNewPackages) {
    console.error(chalk.red(`Invalid project name: "${name}"`))
    result.errors &&
      result.errors.forEach((err) => {
        console.error(chalk.red.dim('Error: ' + err))
      })
    result.warnings &&
      result.warnings.forEach((warn) => {
        console.error(chalk.red.dim('Warning: ' + warn))
      })
    process.exit(1)
  }
}

module.exports = create
