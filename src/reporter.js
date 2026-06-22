'use strict'

const DIMENSIONS = ['Security', 'Speed', 'SEO', 'Efficiency', 'Performance', 'Code Health']

const DIM_ICON = {
  Security:      '🔴',
  Speed:         '🟡',
  SEO:           '🟠',
  Efficiency:    '🔵',
  Performance:   '🟣',
  'Code Health': '🟢',
}

const W  = 76
const HL = '─'.repeat(W)
const DL = '═'.repeat(W)

// ─── JSON output (CI / programmatic consumers) ────────────────────────────────

function reportJSON(result) {
  const summary = Object.fromEntries(
    DIMENSIONS.map(d => [
      d,
      {
        errors:   result.errors.filter(v => v.dimension === d).length,
        warnings: result.warnings.filter(v => v.dimension === d).length,
      },
    ])
  )
  return JSON.stringify({
    passed:     result.passed,
    errors:     result.errors.length,
    warnings:   result.warnings.length,
    violations: result.violations,
    summary,
    meta:       result.meta,
  }, null, 2)
}

// ─── Human-readable terminal output ──────────────────────────────────────────

function reportHuman(result, summaryOnly = false) {
  const lines = []
  const { violations, errors, warnings, meta } = result

  if (violations.length === 0) {
    lines.push(`\n${DL}`)
    lines.push(`  ✅  ARGUS PASSED — @mximz/argus`)
    lines.push(`  Zero violations · ${meta.sites.length} site(s) · ${meta.filesScanned} files · ${_elapsed(meta)}`)
    if (meta.staged) lines.push('  (staged files only)')
    if (meta.deep)   lines.push('  (deep mode)')
    lines.push(`${DL}\n`)
    return lines.join('\n')
  }

  // Group by dimension
  const byDim = Object.fromEntries(DIMENSIONS.map(d => [d, []]))
  for (const v of violations) {
    if (byDim[v.dimension]) byDim[v.dimension].push(v)
  }

  if (!summaryOnly) {
    lines.push(`\n${DL}`)
    lines.push(`  ARGUS — @mximz/argus`)
    lines.push(`  ${errors.length} error${errors.length !== 1 ? 's' : ''} · ${warnings.length} warning${warnings.length !== 1 ? 's' : ''} · ${meta.sites.length} site(s) · ${meta.filesScanned} files · ${_elapsed(meta)}`)
    if (meta.staged) lines.push('  Mode: staged files only')
    if (meta.deep)   lines.push('  Mode: deep audit')
    lines.push(`${DL}\n`)

    for (const dim of DIMENSIONS) {
      const group = byDim[dim]
      if (!group || group.length === 0) continue

      const errCount  = group.filter(v => v.severity === 'error').length
      const warnCount = group.filter(v => v.severity === 'warn').length
      const counts    = [
        errCount  > 0 ? `${errCount} error${errCount  !== 1 ? 's' : ''}` : '',
        warnCount > 0 ? `${warnCount} warning${warnCount !== 1 ? 's' : ''}` : '',
      ].filter(Boolean).join(' · ')

      lines.push(`${DIM_ICON[dim]}  ${dim.toUpperCase()}  (${counts})`)
      lines.push(HL)

      for (const v of group) {
        const badge = v.severity === 'warn' ? '⚠️  WARN' : '🛑 ERROR'
        lines.push(`  ${badge}  [${v.rule}]`)
        lines.push(`  ${v.file}:${v.line}`)
        lines.push(`  ${v.detail}`)
        lines.push('')
      }
    }
  }

  // Summary table — always shown
  lines.push(DL)
  lines.push(`  SUMMARY  ·  ${meta.filesScanned} files scanned  ·  ${_elapsed(meta)}`)
  lines.push(HL)
  for (const dim of DIMENSIONS) {
    const errCount  = (byDim[dim] || []).filter(v => v.severity === 'error').length
    const warnCount = (byDim[dim] || []).filter(v => v.severity === 'warn').length
    let bar
    if (errCount === 0 && warnCount === 0) {
      bar = '✓ clean'
    } else {
      const parts = []
      if (errCount  > 0) parts.push(`${'█'.repeat(Math.min(errCount,  20))} ${errCount} error${errCount  !== 1 ? 's' : ''}`)
      if (warnCount > 0) parts.push(`${'░'.repeat(Math.min(warnCount, 20))} ${warnCount} warning${warnCount !== 1 ? 's' : ''}`)
      bar = parts.join('  ')
    }
    lines.push(`  ${DIM_ICON[dim]}  ${dim.padEnd(14)}  ${bar}`)
  }
  lines.push(HL)
  if (warnings.length > 0 && errors.length === 0) {
    lines.push('  Warnings do not block commits — but address them before they accumulate.')
  } else if (errors.length > 0) {
    lines.push('  🛑  Errors block the commit. Resolve all errors before committing.')
    lines.push('  Suppress known exceptions with:  // argus-ignore  (same line)')
    lines.push('                                   // argus-ignore-next-line')
  }
  lines.push(`${DL}\n`)

  return lines.join('\n')
}

function _elapsed(meta) {
  if (!meta._startTime) return ''
  return `${((Date.now() - meta._startTime) / 1000).toFixed(2)}s`
}

module.exports = { reportHuman, reportJSON, DIMENSIONS }
