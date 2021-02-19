const EventEmitter = require('events')
const chalk = require('chalk')
const execa = require('execa')
const ora = require('ora')
const inquirer = require('inquirer')
const PromptModuleAPI = require('./PromptModuleAPI')
const generate = require('./generate')
const { hasGit, hasProjectGit, hasYarn } = require('./utils/env')
const { clearConsole } = require('./utils/logger')
const PackageManager = require('./utils/PackageManager')
const writeFileTree = require('./utils/writeFileTree')
const isManualMode = () => true

module.exports = class Creator extends EventEmitter {
  constructor(name, context, promptModules) {
    super()
    this.name = name
    this.context = context
    this.featurePrompt = this.resolveIntroPrompts()
    this.outroPrompts = this.resolveOutroPrompts()
    this.injectedPrompts = []
    this.promptCompleteCbs = []
    // this.afterInvokeCbs = []
    // this.afterAnyInvokeCbs = []
    this.run = this.run.bind(this)
    const promptAPI = new PromptModuleAPI(this)
    promptModules.forEach((m) => m(promptAPI))
  }

  async create(cliOptions = {}, options = {}) {
    const { name, run, context } = this
    Object.assign(options, await this.promptAndResolvePreset())
    const packageManager = cliOptions.packageManager || (hasYarn() ? 'yarn' : null) || 'npm'
    this.pm = new PackageManager({ context, packageManager, registry: cliOptions.registry })

    await clearConsole()

    console.log(`✨ Creating project in ${chalk.green(context)}.`)
    this.emit('creation', { event: 'creating' })

    // generate package.json with plugin dependencies
    const pkg = {
      name,
      version: '0.1.0',
      private: true,
      dependencies: {},
      devDependencies: {},
    }

    // generate files
    await generate(context, { pkg, rootOptions: cliOptions, options })

    if (this.pm.bin === 'yarn') {
      await writeFileTree(context, {
        '.yarnrc': `registry "${this.pm.registry}"`,
      })
    } else if (this.pm.bin === 'npm') {
      await writeFileTree(context, {
        '.npmrc': `registry = "${this.pm.registry}"`,
      })
    }

    const shouldInitGit = this.shouldInitGit(cliOptions)
    if (shouldInitGit) {
      const init = ora(`Initializing git repository...`).start()
      this.emit('creation', { event: 'git-init' })
      try {
        await run('git init')
        init.succeed()
      } catch (e) {
        init.fail()
      }
    }

    // install dependency
    const installing = ora(`Installing dependency...`).start()
    try {
      await this.pm.install()
      installing.succeed()
    } catch (e) {
      installing.fail()
      throw e
    }

    // commit initial state
    let gitCommitFailed = false
    if (shouldInitGit) {
      await run('git add -A')
      const msg = typeof cliOptions.git === 'string' ? cliOptions.git : 'Initialize project'
      const commit = ora(`Perform initial commit...`).start()
      try {
        await run('git', ['commit', '-m', msg, '--no-verify'])
        commit.succeed()
      } catch (e) {
        commit.fail()
        gitCommitFailed = true
      }
    }

    // log instructions
    console.log(`🎉  Successfully created project ${chalk.yellow(name)}.`)
    if (!cliOptions.skipGetStarted) {
      console.log(
        `👉  Get started with the following commands:\n\n` +
          (this.context === process.cwd() ? `` : chalk.cyan(` ${chalk.gray('$')} cd ${name}\n`)) +
          chalk.cyan(
            ` ${chalk.gray('$')} ${packageManager === 'yarn' ? 'yarn start' : 'npm run start'}`,
          ),
      )
    }

    this.emit('creation', { event: 'done' })

    if (gitCommitFailed) {
      console.warn(
        `Skipped git commit due to missing username and email in git config, or failed to sign commit.\n` +
          `You will need to perform the initial commit yourself.\n`,
      )
    }
  }

  run(command, args) {
    if (!args) {
      ;[command, ...args] = command.split(/\s+/)
    }
    return execa(command, args, { cwd: this.context })
  }

  async promptAndResolvePreset(answers = null) {
    if (!answers) {
      await clearConsole(true)
      answers = await inquirer.prompt(this.resolveFinalPrompts())
    }

    answers.features = answers.features || []
    // run cb registered by prompt modules to finalize the preset
    this.promptCompleteCbs.forEach((cb) => cb(answers))
    return answers
  }

  resolveIntroPrompts() {
    const featurePrompt = {
      name: 'features',
      when: isManualMode,
      type: 'checkbox',
      message: 'Check the features needed for your project:',
      choices: [],
      pageSize: 10,
    }
    return featurePrompt
  }

  resolveOutroPrompts() {
    const outroPrompts = [
      {
        name: 'useConfigFiles',
        when: isManualMode,
        type: 'list',
        message: 'Where do you prefer placing config for Babel, ESLint, etc.?',
        choices: [
          {
            name: 'In dedicated config files',
            value: 'files',
          },
          {
            name: 'In package.json',
            value: 'pkg',
          },
        ],
      },
    ]

    return outroPrompts
  }

  resolveFinalPrompts() {
    // patch generator-injected prompts to only show in manual mode
    this.injectedPrompts.forEach((prompt) => {
      const originalWhen = prompt.when || (() => true)
      prompt.when = (answers) => {
        return isManualMode(answers) && originalWhen(answers)
      }
    })

    const prompts = [this.featurePrompt, ...this.injectedPrompts, ...this.outroPrompts]
    return prompts
  }

  shouldInitGit(cliOptions) {
    if (!hasGit()) {
      return false
    }
    // --git
    if (cliOptions.forceGit) {
      return true
    }
    // --no-git
    if (cliOptions.git === false || cliOptions.git === 'false') {
      return false
    }
    // default: true unless already in a git repo
    return !hasProjectGit(this.context)
  }
}
