'use strict'

const { readLines } = require('./walker')

// ─── Suppression directives ───────────────────────────────────────────────────
//
//  JS / TS / TSX:
//    // argus-ignore                (same line)
//    // argus-ignore-next-line      (line above)
//    {/* argus-ignore */}           (JSX same line)
//    {/* argus-ignore-next-line */} (JSX line above)
//
//  CSS modules:
//    /* argus-ignore */             (same line)
//    /* argus-ignore-next-line */   (line above)
//
//  Legacy aliases (sssep-ignore) are accepted for backward compatibility.
//
// ─────────────────────────────────────────────────────────────────────────────

const IGNORE_RE      = /(?:\/\/|\/\*|\{\/\*)\s*(?:argus|sssep)-ignore\b/
const IGNORE_NEXT_RE = /(?:\/\/|\/\*|\{\/\*)\s*(?:argus|sssep)-ignore-next-line\b/
const CSS_IGNORE_RE      = /\/\*\s*(?:argus|sssep)-ignore\s*\*\//
const CSS_IGNORE_NEXT_RE = /\/\*\s*(?:argus|sssep)-ignore-next-line\s*\*\//

function isIgnored(filePath, lineNumber) {
  const lines   = readLines(filePath)
  const current = lines[lineNumber - 1] || ''
  const prev    = lines[lineNumber - 2] || ''

  if (filePath.endsWith('.css')) {
    return CSS_IGNORE_RE.test(current) || CSS_IGNORE_NEXT_RE.test(prev)
  }
  return IGNORE_RE.test(current) || IGNORE_NEXT_RE.test(prev)
}

module.exports = { isIgnored }
