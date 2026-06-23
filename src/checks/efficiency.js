'use strict'

const path = require('path')
const { walk, readLines } = require('../walker')

function checkEfficiency(ctx) {
  const { sites, flag } = ctx
  _checkConsoleLog(sites, flag)
  _checkUnresolvedDebt(sites, flag)
}

// EF1 — No console.log / console.debug in production code.
// Debug statements increase bundle size and leak implementation details.
// console.error and console.warn are permitted — they signal operational issues.
function _checkConsoleLog(sites, flag) {
  const CONSOLE_RE = /console\.(log|debug|info|dir)\s*\(/
  for (const site of sites) {
    for (const file of walk(path.join(site.root, 'app'), ['.ts', '.tsx'])) {
      readLines(file).forEach((line, i) => {
        const trimmed = line.trim()
        if (CONSOLE_RE.test(line) && !trimmed.startsWith('//') && !trimmed.startsWith('*')) {
          flag('Efficiency', 'EF1:console-log', file, i + 1,
            `console.${line.match(CONSOLE_RE)[1]}() in production code — remove before committing`,
            'Delete this line — use console.error() for errors and console.warn() for operational signals only')
        }
      })
    }
  }
}

// EF2 — No TODO / FIXME / HACK markers in committed code.
// These signal unfinished work. Ship a tracked issue instead.
// Only flags when the marker appears inside a comment line.
const DEBT_MARKERS   = /\b(TODO|FIXME|HACK|XXX)\b/
const COMMENT_LINE   = /^\s*(\/\/|\/\*|\*)/

function _checkUnresolvedDebt(sites, flag) {
  for (const site of sites) {
    for (const file of walk(path.join(site.root, 'app'), ['.ts', '.tsx', '.module.css'])) {
      readLines(file).forEach((line, i) => {
        if (DEBT_MARKERS.test(line) && COMMENT_LINE.test(line)) {
          const marker = (line.match(DEBT_MARKERS) || [''])[0]
          flag('Efficiency', 'EF2:unresolved-debt', file, i + 1,
            `${marker} in comment — resolve before shipping, or raise a tracked issue in your project management tool`,
            `Resolve the ${marker} inline, or create a tracked issue and delete this comment before committing`)
        }
      })
    }
  }
}

module.exports = { checkEfficiency }
