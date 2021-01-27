const mergeValue = require('./mergeValue')
const path = require('path')

const transformJS = {
  read: ({ filename, context }) => {
    try {
      return require(path.resolve(context, filename))
    } catch (e) {
      return null
    }
  },
  write: ({ value, existing }) => {
    if (existing) {
      return `module.exports = ${JSON.stringify(mergeValue(value, existing), null, 2)}`
    } else {
      return `module.exports = ${JSON.stringify(value, null, 2)}`
    }
  }
}

const transformJSON = {
  read: ({ source }) => JSON.parse(source),
  write: ({ value, existing }) => {
    return JSON.stringify(mergeValue(value, existing), null, 2)
  }
}

const transformYAML = {
  read: ({ source }) => require('js-yaml').load(source),
  write: ({ value, existing }) => {
    return require('js-yaml').dump(mergeValue(value, existing), {
      skipInvalid: true
    })
  }
}

const transformLines = {
  read: ({ source }) => source.split('\n'),
  write: ({ value, existing }) => {
    if (existing) {
      value = existing.concat(value)
      // Dedupe
      value = value.filter((item, index) => value.indexOf(item) === index)
    }
    return value.join('\n')
  }
}

module.exports = {
  js: transformJS,
  json: transformJSON,
  yaml: transformYAML,
  lines: transformLines
}
