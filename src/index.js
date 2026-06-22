'use strict'

/**
 * @mximz/argus — programmatic API
 *
 * Usage:
 *   const argus = require('@mximz/argus')
 *
 *   const result = argus.run({ root: process.cwd() })
 *   if (!result.passed) process.exit(1)
 *
 *   // With options:
 *   const result = argus.run({
 *     root:       '/path/to/project',
 *     configPath: '/path/to/argus.config.js',
 *     staged:     true,   // scan staged files only
 *     deep:       true,   // include deep-mode checks (CH4, etc.)
 *   })
 */

const { loadConfig }   = require('./config')
const { run: _run }    = require('./runner')
const { reportHuman, reportJSON } = require('./reporter')

function run(options = {}) {
  const { root, configPath, staged = false, deep = false } = options
  const config = loadConfig(root, configPath)
  const result = _run(config, { staged, deep })
  result.meta._startTime = result.meta._startTime || Date.now()
  return result
}

module.exports = {
  run,
  loadConfig,
  reportHuman,
  reportJSON,
}
