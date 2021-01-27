const deepmerge = require('deepmerge')

const mergeArrayWithDedupe = (a, b) => Array.from(new Set([...a, ...b]))
module.exports = function mergeValue(value, existing) {
  if (Array.isArray(value) && Array.isArray(existing)) {
    return mergeArrayWithDedupe(existing, value)
  } else if (typeof value === 'object' && typeof existing === 'object') {
    return deepmerge(existing, value, { arrayMerge: mergeArrayWithDedupe })
  } else {
    return value
  }
}
