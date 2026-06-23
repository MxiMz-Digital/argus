'use strict'

const { getTrend } = require('./history')

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
    patterns:   result.patterns || [],
    summary,
    meta:       result.meta,
  }, null, 2)
}

// ─── Human-readable terminal output ──────────────────────────────────────────

function reportHuman(result, summaryOnly = false) {
  const lines = []
  const { violations, errors, warnings, patterns = [], meta } = result
  const history = result.history || null

  if (violations.length === 0) {
    lines.push(`\n${DL}`)
    lines.push(`  ✅  ARGUS PASSED — @mximz/argus`)
    lines.push(`  Zero violations · ${meta.sites.length} site(s) · ${meta.filesScanned} files · ${_elapsed(meta)}`)
    if (meta.staged) lines.push('  (staged files only)')
    if (meta.deep)   lines.push('  (deep mode)')

    // Show trend even on a clean pass
    if (history && history.length >= 2) {
      const t = getTrend(history, null)
      if (t && t.direction !== '→') {
        lines.push(`  Trend: ${t.direction} ${Math.abs(t.delta)} violation${Math.abs(t.delta) !== 1 ? 's' : ''} vs previous run`)
      }
    }

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
        if (v.suggestion) lines.push(`  💡 ${v.suggestion}`)
        lines.push('')
      }
    }

    // ── Patterns section ───────────────────────────────────────────────────
    if (patterns.length > 0) {
      lines.push(DL)
      lines.push(`  PATTERNS DETECTED  ·  ${patterns.length} pattern${patterns.length !== 1 ? 's' : ''}`)
      lines.push(HL)
      for (const p of patterns) {
        if (p.type === 'systemic') {
          lines.push(`  🔁 SYSTEMIC`)
          lines.push(`  ${p.detail}`)
          lines.push(`  → ${p.action}`)
        } else if (p.type === 'repeated-value') {
          lines.push(`  🔁 REPEATED VALUE`)
          lines.push(`  ${p.detail}`)
          lines.push(`  → ${p.action}`)
        } else if (p.type === 'hotspot') {
          lines.push(`  🔥 HOTSPOT  ${p.file}`)
          lines.push(`  ${p.detail}`)
          lines.push(`  → ${p.action}`)
        }
        lines.push('')
      }
    }
  }

  // ── Summary table ─────────────────────────────────────────────────────────
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

    const trend = _trendSuffix(history, dim)
    lines.push(`  ${DIM_ICON[dim]}  ${dim.padEnd(14)}  ${bar.padEnd(30)}${trend}`)
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

// ─── Trend report (--trend flag) ─────────────────────────────────────────────

function reportTrend(history) {
  const lines = []
  lines.push(`\n${DL}`)

  if (!history || history.length === 0) {
    lines.push('  ARGUS TREND — no history yet')
    lines.push(`  Run argus to start tracking. History is saved in .argus-history.json`)
    lines.push(`${DL}\n`)
    return lines.join('\n')
  }

  const show = history.slice(-20)  // show last 20 runs maximum
  lines.push(`  ARGUS TREND — last ${show.length} run${show.length !== 1 ? 's' : ''}`)
  lines.push(HL)
  lines.push('  DATE              TIME      ERRORS  WARN   TOTAL  CHANGE')
  lines.push(HL)

  for (let i = 0; i < show.length; i++) {
    const entry = show[i]
    const d     = new Date(entry.timestamp)
    const date  = d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    const time  = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })

    let change = ''
    if (i > 0) {
      const prev  = show[i - 1].total
      const curr  = entry.total
      const delta = curr - prev
      if (delta !== 0) {
        const sign = delta > 0 ? '+' : ''
        const arrow = delta > 0 ? '↑' : '↓'
        change = `${arrow}${sign}${delta}`
      } else {
        change = '→'
      }
    }

    lines.push(
      `  ${date.padEnd(14)}  ${time.padEnd(8)}  ` +
      `${String(entry.errors).padEnd(7)} ` +
      `${String(entry.warnings).padEnd(6)} ` +
      `${String(entry.total).padEnd(6)} ` +
      change
    )
  }

  lines.push(HL)

  // Overall trend summary
  if (show.length >= 2) {
    const first = show[0].total
    const last  = show[show.length - 1].total
    const delta = last - first
    if (delta < 0) {
      lines.push(`  Trend: improving ↓  (${first} → ${last} over ${show.length} runs)`)
    } else if (delta > 0) {
      lines.push(`  Trend: worsening ↑  (${first} → ${last} over ${show.length} runs)`)
    } else {
      lines.push(`  Trend: stable →  (${last} violations over ${show.length} runs)`)
    }
  }

  lines.push(`${DL}\n`)
  return lines.join('\n')
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function _elapsed(meta) {
  if (!meta._startTime) return ''
  return `${((Date.now() - meta._startTime) / 1000).toFixed(2)}s`
}

function _trendSuffix(history, dimension) {
  if (!history || history.length < 2) return ''
  const t = getTrend(history, dimension)
  if (!t || t.direction === '→') return ''
  const sign = t.delta > 0 ? '+' : ''
  return `${t.direction}${sign}${t.delta}`
}

module.exports = { reportHuman, reportJSON, reportTrend, DIMENSIONS }
