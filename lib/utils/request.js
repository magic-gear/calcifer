module.exports = {
  get(url, opts) {
    const fetch = require('node-fetch')
    const reqOpts = {
      method: 'GET',
      timeout: 30000,
      ...opts
    }

    return fetch(url, reqOpts).then((result) => result.json())
  }
}
