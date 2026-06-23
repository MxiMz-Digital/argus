'use strict'

const fs   = require('fs')
const path = require('path')

const HISTORY_FILE = '.argus-history.json'
const MAX_ENTRIES  = 30
const DIMENSIONS   = ['Security', 'Speed', 'SEO', 'Efficiency', 'Performance', 'Code Health']

function loadHistory(root) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, HISTORY_FILE), 'utf8'))
  } catch {
    return []
  }
}

function saveRun(root, result) {
  const history = loadHistory(root)
  history.push({
    timestamp:   result.meta.timestamp,
    errors:      result.errors.length,
    warnings:    result.warnings.length,
    total:       result.violations.length,
    byDimension: Object.fromEntries(
      DIMENSIONS.map(d => [d, result.violations.filter(v => v.dimension === d).length])
    ),
  })
  const trimmed = history.slice(-MAX_ENTRIES)
  try {
    fs.writeFileSync(path.join(root, HISTORY_FILE), JSON.stringify(trimmed, null, 2))
  } catch {
    // history write is non-fatal — local fs permission issues must not break the audit
  }
  return trimmed
}

// Returns { prev, curr, delta, direction } for a dimension or overall total.
// Returns null when there is only one run (no previous to compare against).
function getTrend(history, dimension) {
  if (!history || history.length < 2) return null
  const prev = dimension
    ? (history[history.length - 2]?.byDimension?.[dimension] ?? 0)
    : (history[history.length - 2]?.total ?? 0)
  const curr = dimension
    ? (history[history.length - 1]?.byDimension?.[dimension] ?? 0)
    : (history[history.length - 1]?.total ?? 0)
  const delta = curr - prev
  return {
    prev,
    curr,
    delta,
    direction: delta > 0 ? '↑' : delta < 0 ? '↓' : '→',
  }
}

module.exports = { loadHistory, saveRun, getTrend, HISTORY_FILE }
