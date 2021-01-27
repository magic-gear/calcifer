const chalk = require('chalk')

module.exports = function mergeDeps(sourceDeps, depsToInject) {
  const result = Object.assign({}, sourceDeps)

  for (const depName in depsToInject) {
    const sourceRange = sourceDeps[depName]
    const injectingRange = depsToInject[depName]
    if (sourceRange === injectingRange) continue
    if (!sourceRange) {
      result[depName] = injectingRange
    } else {
      // todo: add version check
      console.warn(
        `overwrite existing ${chalk.blue(depName)}):${sourceRange} by ${chalk.yellow(
          injectingRange
        )}`
      )
      result[depName] = injectingRange
    }
  }
  return result
}
