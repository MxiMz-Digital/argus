'use strict'

const SYSTEMIC_THRESHOLD     = 3  // same rule fires in N+ distinct files
const HOTSPOT_THRESHOLD      = 4  // N+ violations in one file
const REPEAT_VALUE_MIN_FILES = 2  // same hardcoded hex in N+ files

function detectPatterns(violations) {
  if (!violations.length) return []
  const patterns = []

  // 1. Systemic — same rule fires across 3+ distinct files
  const byRule = _groupBy(violations, 'rule')
  for (const [rule, vs] of Object.entries(byRule)) {
    const uniqueFiles = [...new Set(vs.map(v => v.file))]
    if (uniqueFiles.length >= SYSTEMIC_THRESHOLD) {
      patterns.push({
        type:   'systemic',
        rule,
        count:  vs.length,
        files:  uniqueFiles.length,
        detail: `[${rule}] fires in ${uniqueFiles.length} files (${vs.length} total) — systemic drift, not an isolated mistake`,
        action: 'Address the root cause codebase-wide rather than patching file by file',
      })
    }
  }

  // 2. Repeated value — same hardcoded hex colour in 2+ files
  const colourVs = violations.filter(v =>
    v.rule === 'CH1:hardcode-colour' || v.rule === 'CH1:hardcode-colour-shorthand'
  )
  const byValue = {}
  for (const v of colourVs) {
    const m = v.detail.match(/#[0-9a-fA-F]{3,8}\b/)
    if (!m) continue
    const hex = m[0].toLowerCase()
    if (!byValue[hex]) byValue[hex] = new Set()
    byValue[hex].add(v.file)
  }
  for (const [hex, files] of Object.entries(byValue)) {
    if (files.size >= REPEAT_VALUE_MIN_FILES) {
      patterns.push({
        type:   'repeated-value',
        value:  hex,
        files:  files.size,
        detail: `'${hex}' hardcoded in ${files.size} files`,
        action: `Define one CSS custom property (e.g. --your-token: ${hex}) and reference it everywhere`,
      })
    }
  }

  // 3. Hotspot — one file accumulates 4+ violations
  const byFile = _groupBy(violations, 'file')
  for (const [file, vs] of Object.entries(byFile)) {
    if (vs.length >= HOTSPOT_THRESHOLD) {
      const dims = [...new Set(vs.map(v => v.dimension))].join(', ')
      patterns.push({
        type:   'hotspot',
        file,
        count:  vs.length,
        detail: `${vs.length} violations across: ${dims}`,
        action: 'Schedule a dedicated refactor session for this file rather than addressing violations one by one',
      })
    }
  }

  return patterns
}

function _groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key]
    if (!acc[k]) acc[k] = []
    acc[k].push(item)
    return acc
  }, {})
}

module.exports = { detectPatterns }
