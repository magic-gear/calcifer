#!/usr/bin/env node

const program = require('commander')
const chalk = require('chalk')
const packageJson = require('../package.json')
const path = require('path')
const os = require('os')

program.exitOverride(function (err) {
  if (err.code === 'commander.missingArgument') {
    this.outputHelp()
  }
  process.exit(err.exitCode)
})

program
  .name(chalk.keyword('orange')(path.basename(packageJson.name)))
  .version(packageJson.version)
  .usage('<command> [options]')
  .allowUnknownOption()
  .configureOutput({
    outputError: (str, write) => write(chalk.red(str))
  })

program
  .command('create <project-name>')
  .description(`create a new project powered by ${program.name()}`)
  .option(
    '-m, --packageManager <packageManager>',
    'specified package manager to install dependencies'
  )
  .option('-g, --git [message]', 'force git initialization with initial commit message')
  .option('-n, --no-git', 'skip git initialization')
  .option('-r, --registry <url>', 'Use specified registry when installing dependencies')
  .action((name, options) => {
    require('../lib/create')(name, options)
  })

program.parse(process.argv)
