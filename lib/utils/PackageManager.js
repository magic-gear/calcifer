const path = require('path')
const chalk = require('chalk')
const semver = require('semver')
const os = require('os')
const LRU = require('lru-cache')
const execa = require('execa')
const { hasPnpmVersionOrLater } = require('./env')
const stripAnsi = require('strip-ansi')
const request = require('./request')
const registries = require('./registries')

const metadataCache = new LRU({
  max: 200,
  maxAge: 1000 * 60 * 30 // 30 min.
})

const SUPPORTED_PACKAGE_MANAGERS = ['yarn', 'pnpm', 'npm']
const PACKAGE_MANAGER_PNPM4_CONFIG = {
  install: ['install', '--reporter', 'silent', '--shamefully-hoist'],
  add: ['install', '--reporter', 'silent', '--shamefully-hoist'],
  upgrade: ['update', '--reporter', 'silent'],
  remove: ['uninstall', '--reporter', 'silent']
}
const PACKAGE_MANAGER_PNPM3_CONFIG = {
  install: ['install', '--loglevel', 'error', '--shamefully-flatten'],
  add: ['install', '--loglevel', 'error', '--shamefully-flatten'],
  upgrade: ['update', '--loglevel', 'error'],
  remove: ['uninstall', '--loglevel', 'error']
}
const PACKAGE_MANAGER_CONFIG = {
  npm: {
    install: ['install', '--loglevel', 'error'],
    add: ['install', '--loglevel', 'error'],
    upgrade: ['update', '--loglevel', 'error'],
    remove: ['uninstall', '--loglevel', 'error']
  },
  pnpm: hasPnpmVersionOrLater('4.0.0')
    ? PACKAGE_MANAGER_PNPM4_CONFIG
    : PACKAGE_MANAGER_PNPM3_CONFIG,
  yarn: {
    install: [],
    add: ['add'],
    upgrade: ['upgrade'],
    remove: ['remove']
  }
}

class PackageManager {
  constructor({ context, packageManager, registry } = {}) {
    this.context = context || process.cwd()
    this.registry = registry || registries.taobao
    this.bin = packageManager
    if (this.bin === 'npm') {
      const npmVersion = stripAnsi(execa.sync('npm', ['--version']).stdout)
      if (semver.gte(npmVersion, '7.0.0')) {
        this.needsPeerDepsFix = true
      }
    }

    if (!SUPPORTED_PACKAGE_MANAGERS.includes(this.bin)) {
      console.log()
      console.warn(
        `The package manager ${chalk.red(this.bin)} is ${chalk.red(
          'not officially supported'
        )}.\n` +
          `It will be treated like ${chalk.cyan('npm')}, but compatibility issues may occur.\n` +
          `See if you can use ${chalk.cyan('--registry')} instead.`
      )
      PACKAGE_MANAGER_CONFIG[this.bin] = PACKAGE_MANAGER_CONFIG.npm
    }
  }

  async setRegistryEnvs() {
    const registry = this.registry

    process.env.npm_config_registry = registry
    process.env.YARN_NPM_REGISTRY_SERVER = registry
    await this.setBinaryMirrors()
  }

  // set mirror urls for users in china
  async setBinaryMirrors() {
    const registry = this.registry

    if (registry !== registries.taobao) {
      return
    }

    try {
      // chromedriver, etc.
      const binaryMirrorConfigMetadata = await this.getMetadata('binary-mirror-config', {
        full: true
      })
      const latest =
        binaryMirrorConfigMetadata['dist-tags'] && binaryMirrorConfigMetadata['dist-tags'].latest
      const mirrors = binaryMirrorConfigMetadata.versions[latest].mirrors.china
      for (const key in mirrors.ENVS) {
        process.env[key] = mirrors.ENVS[key]
      }

      // Cypress
      const cypressMirror = mirrors.cypress
      const defaultPlatforms = {
        darwin: 'osx64',
        linux: 'linux64',
        win32: 'win64'
      }
      const platforms = cypressMirror.newPlatforms || defaultPlatforms
      const targetPlatform = platforms[`${os.platform()}-${os.arch()}`] || platforms[os.platform()]

      // Do not override user-defined env variable
      // Because we may construct a wrong download url and an escape hatch is necessary
      if (targetPlatform && !process.env.CYPRESS_INSTALL_BINARY) {
        let projectPkg = {}
        try {
          projectPkg = require(path.resolve(this.context, 'package.json'))
        } catch (e) {}
        if (projectPkg && projectPkg.devDependencies && projectPkg.devDependencies.cypress) {
          const wantedCypressVersion = await this.getRemoteVersion(
            'cypress',
            projectPkg.devDependencies.cypress
          )
          process.env.CYPRESS_INSTALL_BINARY = `${cypressMirror.host}/${wantedCypressVersion}/${targetPlatform}/cypress.zip`
        }
      }
    } catch (e) {
      // get binary mirror config failed
    }
  }

  // https://github.com/npm/registry/blob/master/docs/responses/package-metadata.md
  async getMetadata(packageName, { full = false } = {}) {
    const registry = this.registry

    const metadataKey = `${this.bin}-${registry}-${packageName}`
    let metadata = metadataCache.get(metadataKey)

    if (metadata) {
      return metadata
    }

    const headers = {}
    if (!full) {
      headers.Accept =
        'application/vnd.npm.install-v1+json;q=1.0, application/json;q=0.9, */*;q=0.8'
    }

    const url = `${registry.replace(/\/$/g, '')}/${packageName}`
    try {
      metadata = await request.get(url, { headers })
      if (metadata.error) {
        throw new Error(metadata.error)
      }
      metadataCache.set(metadataKey, metadata)
      return metadata
    } catch (e) {
      console.error(`Failed to get response from ${url}`)
      throw e
    }
  }

  async getRemoteVersion(packageName, versionRange = 'latest') {
    const metadata = await this.getMetadata(packageName)
    if (Object.keys(metadata['dist-tags']).includes(versionRange)) {
      return metadata['dist-tags'][versionRange]
    }
    const versions = Array.isArray(metadata.versions)
      ? metadata.versions
      : Object.keys(metadata.versions)
    return semver.maxSatisfying(versions, versionRange)
  }

  async runCommand(command, args) {
    await this.setRegistryEnvs()
    return execa(this.bin, [...PACKAGE_MANAGER_CONFIG[this.bin][command], ...(args || [])], {
      cwd: this.context
    })
  }

  async install() {
    const args = []

    if (this.needsPeerDepsFix) {
      args.push('--legacy-peer-deps')
    }

    if (process.env.VUE_CLI_TEST) {
      args.push('--silent', '--no-progress')
    }

    return await this.runCommand('install', args)
  }

  async add(packageName, { tilde = false, dev = true } = {}) {
    const args = dev ? ['-D'] : []
    if (tilde) {
      if (this.bin === 'yarn') {
        args.push('--tilde')
      } else {
        process.env.npm_config_save_prefix = '~'
      }
    }

    if (this.needsPeerDepsFix) {
      args.push('--legacy-peer-deps')
    }

    return await this.runCommand('add', [packageName, ...args])
  }

  async remove(packageName) {
    return await this.runCommand('remove', [packageName])
  }
}

module.exports = PackageManager
